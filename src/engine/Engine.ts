import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import type { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

import { BODIES, BODY_BY_ID, CATALOG_BY_ID, REGIONS, isBody, isRegion, PROPULSION_BY_ID } from '@/data';
import type { CelestialBody, Region } from '@/data/types';
import { Ephemeris, type BodyState } from '@/science/ephemeris';
import { transferDeltaVUsedAt, transferVelocityAt } from '@/science/transfer';
import { AU_KM, C_KMS, dateToJulianDate, julianDateToSimSeconds, simSecondsToJulianDate, smoothstep } from '@/science/units';
import { distance as vdist, length as vlen, type Vec3 } from '@/science/vec3';
import { useStore, type RegionZone } from '@/state/store';
import { AudioEngine } from '@/audio/AudioEngine';

import { BodyView } from './bodies/BodyView';
import { buildOrbitLine, type OrbitLine } from './bodies/OrbitLines';
import { ParticleBelt } from './effects/Belts';
import { Heliosphere } from './effects/Heliosphere';
import { createVignettePass } from './effects/VignettePass';
import { StarField, SKY_RADIUS } from './starfield/StarField';
import { ShipModel } from './ship/ShipModel';
import { Input } from './input/Input';
import { LabelLayer, type LabelFrame } from './labels/LabelLayer';
import { CameraRig } from './CameraRig';
import { eclToThree, threeToEcl } from './frames';
import { approachDirection, solveTransfer, visualDurationFor, type CourseRun, type NavTarget } from './nav/Navigation';
import { registerEngine } from './bridge';

type Mode = 'HOLD' | 'MANUAL' | 'COURSE';

const TELEMETRY_HZ = 12;

export class Engine {
  readonly container: HTMLElement;
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly rig: CameraRig;
  readonly input: Input;
  readonly labels: LabelLayer;
  readonly audio = new AudioEngine();
  readonly eph: Ephemeris;
  readonly stars: StarField;
  readonly ship = new ShipModel();

  private composer: EffectComposer;
  private bloom: UnrealBloomPass;
  private vignette: ShaderPass;
  private views = new Map<string, BodyView>();
  private orbitLines: OrbitLine[] = [];
  private belts: ParticleBelt[] = [];
  private helio: Heliosphere;
  private states: Map<string, BodyState>;

  private simTime: number;
  private time = 0;
  private lastMs = 0;
  private raf = 0;
  private lastTelemetry = 0;
  private running = false;

  private shipPos = new THREE.Vector3();
  private shipPrev = new THREE.Vector3();
  private shipVel = new THREE.Vector3();
  private shipQuat = new THREE.Quaternion();
  private desiredQuat = new THREE.Quaternion();
  private mode: Mode = 'HOLD';
  private holdTargetId: string | null = 'earth';
  private holdOffset = new THREE.Vector3();
  private course: CourseRun | null = null;
  private courseTarget: NavTarget | null = null;
  private pendingTargetId: string | null = null;
  private thrustLevel = 0;
  private scanTimer: { id: string; t: number } | null = null;
  private zone: RegionZone = 'INNER_SYSTEM';
  private width = 1;
  private height = 1;
  private frameTimes: number[] = [];
  private pixelRatioCap = 1.75;
  private starFade = 0;

  private readonly tmpV = new THREE.Vector3();
  private readonly tmpV2 = new THREE.Vector3();
  private readonly sunPos = new THREE.Vector3(0, 0, 0);

  constructor(container: HTMLElement) {
    this.container = container;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true, powerPreference: 'high-performance' });
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor(0x000000, 1);
    this.renderer.domElement.className = 'space-canvas';
    container.appendChild(this.renderer.domElement);

    this.rig = new CameraRig(1);
    this.input = new Input(this.renderer.domElement);
    this.labels = new LabelLayer(container);
    this.labels.setSelectHandler((id) => this.select(id));

    this.simTime = julianDateToSimSeconds(dateToJulianDate(new Date()));
    useStore.setState({ simTime: this.simTime, missionStartSimTime: this.simTime });

    this.eph = new Ephemeris(BODIES);
    this.states = this.eph.compute(simSecondsToJulianDate(this.simTime));

    // Sky
    this.stars = new StarField();
    this.scene.add(this.stars.group);
    void this.stars.loadNamedStars().then(() => this.addSkyLabels());

    // Lights for the ship's standard materials (bodies use their own shaders).
    const sun = new THREE.PointLight(0xfff2e0, 2.4, 0, 0);
    const fill = new THREE.HemisphereLight(0x3a4a60, 0x0a0c10, 0.55);
    this.scene.add(sun, fill, new THREE.AmbientLight(0x223044, 0.4));

    // Bodies
    for (const b of BODIES) {
      const view = new BodyView(b, this.eph.visRadiusOf(b.id));
      this.views.set(b.id, view);
      this.scene.add(view.root);
      this.labels.add({ id: b.id, name: b.name, sub: b.classLabel, tier: labelTier(b) });
    }
    // Orbits
    const jd = simSecondsToJulianDate(this.simTime);
    for (const b of BODIES) {
      if (!b.orbit || !b.parentId) continue;
      const parent = BODY_BY_ID[b.parentId];
      const ol = buildOrbitLine(b, parent, this.eph.visRadiusOf(parent.id), jd);
      if (!ol) continue;
      if (b.orbit.unit === 'km') this.views.get(parent.id)!.root.add(ol.line);
      else this.scene.add(ol.line);
      this.orbitLines.push(ol);
    }
    // Regions
    REGIONS.forEach((r, i) => {
      if (r.kind === 'boundary') return;
      const belt = new ParticleBelt(r, 100 + i);
      this.belts.push(belt);
      this.scene.add(belt.group);
    });
    this.helio = new Heliosphere(120);
    this.scene.add(this.helio.mesh);
    const hp = REGIONS.find((r) => r.id === 'heliopause')!;
    this.labels.add({ id: hp.id, name: hp.name, sub: hp.classLabel, tier: 'region' });

    // Ship
    this.scene.add(this.ship.group);
    this.placeShipAtHome();

    // Post-processing
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.rig.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.55, 0.65, 0.82);
    this.composer.addPass(this.bloom);
    this.vignette = createVignettePass();
    this.composer.addPass(this.vignette);
    this.composer.addPass(new OutputPass());

    this.resize();
    window.addEventListener('resize', this.resize);
    this.input.onFirstGesture(() => {
      this.audio.start();
      this.audio.setMuted(useStore.getState().muted);
    });
    registerEngine(this);
  }

  // ───────────────────────────── lifecycle ─────────────────────────────

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastMs = performance.now();
    this.raf = requestAnimationFrame(this.tick);
  }

  dispose(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.resize);
    this.input.dispose();
    this.labels.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
    registerEngine(null);
  }

  private resize = (): void => {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.width = w;
    this.height = h;
    const pr = Math.min(window.devicePixelRatio || 1, this.pixelRatioCap);
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(w, h);
    this.composer.setPixelRatio(pr);
    this.composer.setSize(w, h);
    this.bloom.resolution.set(w * 0.5, h * 0.5);
    (this.vignette.uniforms.uResolution.value as THREE.Vector2).set(w * pr, h * pr);
    this.rig.resize(w / h);
  };

  // ───────────────────────────── public API ─────────────────────────────

  select(id: string | null): void {
    useStore.getState().select(id);
    this.labels.setSelected(id);
    if (id) this.audio.blip(1250, 0.05, 0.03);
  }

  /** Compute a transfer plan to `id` with the current drive and remaining Δv; opens the course panel. */
  planCourse(id: string): void {
    const obj = CATALOG_BY_ID[id];
    if (!obj) return;
    const store = useStore.getState();
    if (this.mode === 'COURSE') {
      store.pushNotice({ kind: 'warning', title: 'COURSE ALREADY ENGAGED', lines: ['Abort the current course first.'], ttl: 4000 });
      return;
    }
    if ('navigable' in obj) {
      store.pushNotice({ kind: 'warning', title: 'OUT OF RANGE', lines: ['Interstellar navigation is not available in this build.', 'See the navigation database for travel times.'], ttl: 6000 });
      return;
    }
    const shipReal = this.shipRealAU();
    const profile = PROPULSION_BY_ID[store.ship.propulsionId];
    const solved = solveTransfer(obj, this.eph, this.states, this.simTime, shipReal, this.shipPos, profile, store.ship.deltaVRemainingKms);
    if (!solved) return;
    const { plan } = solved;
    const durationRealS = visualDurationFor(plan.travelTimeS);
    this.pendingTargetId = id;
    store.setCourse({
      targetId: id,
      plan,
      status: 'PLANNED',
      durationRealS,
      effectiveTimeScale: plan.travelTimeS / durationRealS,
      progress: 0,
      departSimTime: this.simTime,
      arriveSimTime: solved.arriveSimTime,
      currentSeparationKm: solved.currentSeparationKm,
    });
    store.setPanel('course');
    this.audio.blip(980, 0.07, 0.04);
  }

  engageCourse(): void {
    const store = useStore.getState();
    const id = this.pendingTargetId ?? store.course?.targetId;
    if (!id || this.mode === 'COURSE') return;
    const obj = CATALOG_BY_ID[id];
    if (!obj) return;
    const shipReal = this.shipRealAU();
    const profile = PROPULSION_BY_ID[store.ship.propulsionId];
    const solved = solveTransfer(obj, this.eph, this.states, this.simTime, shipReal, this.shipPos, profile, store.ship.deltaVRemainingKms);
    if (!solved) return;
    const { target, plan } = solved;
    const distanceKm = plan.distanceKm;
    if (!Number.isFinite(plan.travelTimeS) || plan.mode === 'NO_PROPULSION') {
      store.pushNotice({ kind: 'warning', title: 'COURSE NOT POSSIBLE', lines: ['No usable Δv remaining.'], ttl: 5000 });
      this.audio.warning();
      return;
    }
    if (distanceKm < 1) {
      store.pushNotice({ kind: 'info', title: 'ALREADY ON STATION', ttl: 3000 });
      return;
    }
    const durationRealS = visualDurationFor(plan.travelTimeS);
    const approachDir = isBody(obj) ? approachDirection(this.shipPos, target.centre) : new THREE.Vector3(0, 0, 0);
    const holdDistanceVis = isBody(obj) ? target.holdPos.distanceTo(target.centre) : 0;
    this.course = {
      targetId: id,
      plan,
      durationRealS,
      departSimTime: this.simTime,
      arriveSimTime: solved.arriveSimTime,
      startVis: this.shipPos.clone(),
      approachDir,
      holdDistanceVis,
      elapsedRealS: 0,
      startDeltaVKms: store.ship.deltaVRemainingKms,
    };
    this.courseTarget = target;
    this.mode = 'COURSE';
    this.holdTargetId = null;
    this.shipVel.set(0, 0, 0);
    store.setCourse({
      targetId: id,
      plan,
      status: 'ENGAGED',
      durationRealS,
      effectiveTimeScale: plan.travelTimeS / durationRealS,
      progress: 0,
      departSimTime: this.simTime,
      arriveSimTime: solved.arriveSimTime,
      currentSeparationKm: solved.currentSeparationKm,
    });
    store.setSim({ flightMode: 'COURSE' });
    store.setPanel(null);
    store.pushNotice({ kind: 'info', title: `COURSE ENGAGED · ${target.name.toUpperCase()}`, lines: ['Simulation time accelerating for transit.'], ttl: 4500 });
    this.audio.navTone();
  }

  abortCourse(): void {
    if (this.mode !== 'COURSE' || !this.course) {
      this.pendingTargetId = null;
      useStore.getState().setCourse(null);
      return;
    }
    const store = useStore.getState();
    const used = transferDeltaVUsedAt(this.course.plan, this.courseSimElapsed());
    const profile = PROPULSION_BY_ID[store.ship.propulsionId];
    const remaining = Math.max(0, this.course.startDeltaVKms - used);
    store.setTelemetry({ deltaVRemainingKms: remaining, fuelFraction: remaining / profile.deltaVBudgetKms });
    this.finishCourse('ABORTED');
    store.pushNotice({ kind: 'warning', title: 'COURSE ABORTED', lines: ['Holding position in visual space.'], ttl: 4000 });
    this.audio.warning();
  }

  /** Plan and immediately engage. */
  approach(id: string): void {
    if (this.mode === 'COURSE') return;
    this.planCourse(id);
    if (useStore.getState().course?.status === 'PLANNED') {
      useStore.getState().setPanel('object');
      this.engageCourse();
    }
  }

  scan(id: string): void {
    const store = useStore.getState();
    if (this.scanTimer) return;
    const obj = CATALOG_BY_ID[id];
    if (!obj) return;
    if (!store.discoveries[id]) store.addDiscovery(id, this.simTime);
    this.scanTimer = { id, t: 0 };
    store.setScan({ objectId: id, progress: 0 });
    this.audio.scanStart();
  }

  resetSimulation(): void {
    const store = useStore.getState();
    this.course = null;
    this.courseTarget = null;
    this.pendingTargetId = null;
    this.scanTimer = null;
    this.simTime = julianDateToSimSeconds(dateToJulianDate(new Date()));
    this.states = this.eph.compute(simSecondsToJulianDate(this.simTime));
    store.resetSimulation();
    store.setSim({ simTime: this.simTime });
    useStore.setState({ missionStartSimTime: this.simTime });
    this.placeShipAtHome();
    this.zone = 'INNER_SYSTEM';
    this.labels.setSelected(null);
    store.pushNotice({ kind: 'info', title: 'SIMULATION RESET', lines: ['AURORA-01 returned to Earth orbit. Discovery log preserved.'], ttl: 4000 });
  }

  setMuted(m: boolean): void {
    this.audio.setMuted(m);
  }

  setLabelsEnabled(v: boolean): void {
    this.labels.setEnabled(v);
  }

  /** Unlock WebAudio from a user gesture (the boot overlay's click/keypress). */
  unlockAudio(): void {
    this.audio.start();
    this.audio.setMuted(useStore.getState().muted);
    this.audio.resume();
  }

  /** Called by the UI when the boot sequence completes. */
  beginFlight(): void {
    const store = useStore.getState();
    store.setPhase('flight');
    this.rig.setDistance(0.55);
    if (!store.discoveries.earth) {
      store.addDiscovery('earth', this.simTime);
      store.pushNotice({ kind: 'identify', title: 'OBJECT IDENTIFIED · EARTH', lines: ['DISCOVERY #001 · HOME', 'The only world known to harbour life.'], ttl: 7000 });
      this.audio.identify();
    }
    // Highlight home without opening a panel: the universe, not the UI, should be the first thing seen.
    useStore.setState({ selectedId: 'earth', panel: null });
    this.labels.setSelected('earth');
  }

  getShipVisualPosition(): THREE.Vector3 {
    return this.shipPos.clone();
  }

  // ───────────────────────────── internals ─────────────────────────────

  private placeShipAtHome(): void {
    const earth = this.states.get('earth')!;
    const earthVis = eclToThree(earth.visPos);
    const toSun = this.sunPos.clone().sub(earthVis).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const side = new THREE.Vector3().crossVectors(up, toSun).normalize();
    const dir = toSun.clone().multiplyScalar(0.55).addScaledVector(up, 0.32).addScaledVector(side, 0.75).normalize();
    this.holdOffset.copy(dir).multiplyScalar(earth.visRadius * 3.4);
    this.holdTargetId = 'earth';
    this.mode = 'HOLD';
    this.shipPos.copy(earthVis).add(this.holdOffset);
    this.shipPrev.copy(this.shipPos);
    this.shipVel.set(0, 0, 0);
    const lookAtEarth = earthVis.clone().sub(this.shipPos).normalize();
    this.desiredQuat.copy(quatFromForward(lookAtEarth));
    this.shipQuat.copy(this.desiredQuat);
    // Camera slightly above the ship–Earth line so Earth sits in the upper half during the opening.
    this.rig.setLookDirection(lookAtEarth, 0.38);
    this.rig.setDistance(4.2, true);
    useStore.getState().setSim({ flightMode: 'HOLD' });
  }

  private shipRealAU(): Vec3 {
    return this.eph.resolveFrame(threeToEcl(this.shipPos), this.states).realPosAU;
  }

  private courseSimElapsed(): number {
    if (!this.course) return 0;
    return Math.min(this.course.plan.travelTimeS, (this.course.elapsedRealS / this.course.durationRealS) * this.course.plan.travelTimeS);
  }

  private finishCourse(status: 'COMPLETE' | 'ABORTED'): void {
    const store = useStore.getState();
    const run = this.course;
    if (run && status === 'COMPLETE' && this.courseTarget) {
      const obj = CATALOG_BY_ID[run.targetId];
      if (isBody(obj)) {
        this.holdTargetId = run.targetId;
        this.holdOffset.copy(run.approachDir).multiplyScalar(run.holdDistanceVis);
      } else {
        this.holdTargetId = null;
        this.holdOffset.set(0, 0, 0);
      }
      this.mode = 'HOLD';
    } else {
      this.mode = 'MANUAL';
      this.holdTargetId = null;
    }
    this.thrustLevel = 0;
    this.shipVel.set(0, 0, 0);
    store.updateCourse({ status, progress: status === 'COMPLETE' ? 1 : store.course?.progress ?? 0 });
    store.setSim({ flightMode: this.mode, effectiveTimeScale: store.timeScale });
    this.course = null;
    this.courseTarget = null;
    this.pendingTargetId = null;
  }

  private tick = (): void => {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.tick);
    const nowMs = performance.now();
    const dt = Math.max(0, Math.min((nowMs - this.lastMs) / 1000, 0.1));
    this.lastMs = nowMs;
    this.time += dt;
    this.trackPerformance(dt);

    const store = useStore.getState();
    const inFlight = store.phase === 'flight';

    // Input
    const d = this.input.consumeDeltas();
    if (inFlight) this.rig.applyInput(d.dx, d.dy, d.wheel);
    const click = this.input.consumeClick();
    if (click && inFlight) this.pick(click.x, click.y);

    // Time
    if (this.mode === 'COURSE' && this.course) {
      this.course.elapsedRealS += dt;
      const simElapsed = this.courseSimElapsed();
      this.simTime = this.course.departSimTime + simElapsed;
    } else if (!store.paused && inFlight) {
      this.simTime += dt * store.timeScale;
    }

    // Ephemeris + body placement
    this.states = this.eph.compute(simSecondsToJulianDate(this.simTime));
    for (const [id, view] of this.views) {
      const st = this.states.get(id)!;
      eclToThree(st.visPos, view.root.position);
    }

    // Ship motion
    this.shipPrev.copy(this.shipPos);
    if (this.mode === 'COURSE') this.updateCourse();
    else if (this.mode === 'HOLD') this.updateHold();
    if (inFlight && this.mode !== 'COURSE') this.updateManual(dt);
    this.resolveCollisions();
    this.updateShipOrientation(dt);

    // Boot camera choreography
    if (!inFlight) {
      this.starFade = smoothstep(1.2, 7.0, this.time);
      this.rig.setDistance(THREE.MathUtils.lerp(4.2, 0.55, smoothstep(2.5, 10.5, this.time)));
    } else {
      this.starFade = Math.min(1, this.starFade + dt * 0.5);
    }

    // Camera
    this.rig.update(this.shipPos, dt);
    const cam = this.rig.camera;
    this.ship.group.position.copy(this.shipPos);
    this.ship.group.quaternion.copy(this.shipQuat);
    this.ship.setThrust(this.thrustLevel);
    this.ship.update(this.time);
    this.audio.setThrust(this.thrustLevel);

    // Scene updates
    const pr = this.renderer.getPixelRatio();
    const sunState = this.states.get('sun')!;
    eclToThree(sunState.visPos, this.sunPos);
    for (const view of this.views.values()) view.update(this.sunPos, cam.position, cam.quaternion, this.time, this.simTime);
    this.applyLevelOfDetail(cam.position);
    for (const belt of this.belts) belt.update(this.simTime - store.missionStartSimTime, pr);
    this.helio.update(this.time, cam.position);
    this.stars.update(cam.position, this.time, pr, this.starFade);
    // Orbit lines read as a map when zoomed out and vanish when the camera is close to a body.
    const zoom = this.rig.distance;
    const helioFade = smoothstep(2.5, 45, zoom);
    const moonFade = smoothstep(0.35, 3.5, zoom) * (1 - smoothstep(60, 400, zoom));
    for (const ol of this.orbitLines) {
      const selected = ol.bodyId === store.selectedId;
      const isMoon = ol.parentId !== 'sun';
      const fade = isMoon ? moonFade : helioFade;
      const opacity = ol.baseOpacity * (selected ? 2.2 : 1) * Math.max(fade, selected ? 0.12 : 0);
      ol.line.visible = store.showOrbits && opacity > 0.004;
      ol.material.opacity = opacity;
      ol.material.color.setRGB(selected ? 0.95 : 0.35, selected ? 0.7 : 0.6, selected ? 0.3 : 0.75);
    }
    this.vignette.uniforms.uTime.value = this.time;
    const warp = this.mode === 'COURSE' ? 1 : Math.min(1, Math.log10(Math.max(1, store.timeScale)) / 6);
    this.vignette.uniforms.uWarp.value = warp;

    // Labels
    if (inFlight) this.updateLabels(store.showLabels);

    // Scan
    if (this.scanTimer) {
      this.scanTimer.t += dt;
      const p = Math.min(1, this.scanTimer.t / 2.8);
      store.setScan({ objectId: this.scanTimer.id, progress: p });
      if (p >= 1) {
        store.markScanned(this.scanTimer.id);
        store.setScan(null);
        const obj = CATALOG_BY_ID[this.scanTimer.id];
        store.pushNotice({ kind: 'scan', title: `SCAN COMPLETE · ${obj?.name.toUpperCase() ?? ''}`, lines: ['Results added to the discovery log.'], ttl: 4500 });
        this.audio.scanStop();
        this.scanTimer = null;
      }
    }

    // Telemetry + discovery (throttled)
    if (this.time - this.lastTelemetry > 1 / TELEMETRY_HZ) {
      this.lastTelemetry = this.time;
      this.publishTelemetry();
      if (inFlight) this.checkDiscoveries();
      store.expireNotices(performance.now());
    }

    this.composer.render(dt);
  };

  private updateHold(): void {
    if (!this.holdTargetId) return;
    const st = this.states.get(this.holdTargetId);
    if (!st) return;
    eclToThree(st.visPos, this.tmpV).add(this.holdOffset);
    this.shipPos.copy(this.tmpV);
    const centre = eclToThree(st.visPos, this.tmpV2);
    const look = centre.sub(this.shipPos).normalize();
    this.desiredQuat.copy(quatFromForward(look));
    this.thrustLevel = 0;
  }

  private updateCourse(): void {
    const run = this.course;
    const target = this.courseTarget;
    if (!run || !target) return;
    const store = useStore.getState();
    const obj = CATALOG_BY_ID[run.targetId];
    // The destination is the target's position at arrival (solved at planning time); the path is a fixed straight line.
    const dest = target.centre.clone().addScaledVector(run.approachDir, run.holdDistanceVis);
    const simElapsed = this.courseSimElapsed();
    const { plan } = run;
    const progress = progressAlong(plan, simElapsed);
    this.shipPos.copy(run.startVis).lerp(dest, progress);

    const vel = this.tmpV.copy(this.shipPos).sub(this.shipPrev);
    const decel = simElapsed > plan.accelTimeS + plan.coastTimeS;
    const coasting = simElapsed > plan.accelTimeS && !decel;
    if (vel.lengthSq() > 1e-12) {
      const dir = vel.normalize();
      if (decel) dir.multiplyScalar(-1);
      this.desiredQuat.copy(quatFromForward(dir));
    }
    this.thrustLevel = coasting || plan.mode === 'CRUISE_FLYBY' ? 0.08 : 1;

    const used = transferDeltaVUsedAt(plan, simElapsed);
    const startDv = run.startDeltaVKms;
    const profile = PROPULSION_BY_ID[store.ship.propulsionId];
    const remaining = Math.max(0, startDv - used);
    store.updateCourse({ progress, effectiveTimeScale: plan.travelTimeS / run.durationRealS });
    store.setSim({ simTime: this.simTime, effectiveTimeScale: plan.travelTimeS / run.durationRealS });
    store.setTelemetry({
      velocityKms: transferVelocityAt(plan, simElapsed),
      velocityFrame: 'TRANSFER',
      accelerationMs2: decel || !coasting ? plan.accelerationMs2 : 0,
      deltaVRemainingKms: remaining,
      fuelFraction: remaining / profile.deltaVBudgetKms,
    });

    if (run.elapsedRealS >= run.durationRealS) {
      this.shipPos.copy(dest);
      this.simTime = run.arriveSimTime;
      const finalDv = Math.max(0, startDv - plan.deltaVUsedKms);
      store.setTelemetry({ deltaVRemainingKms: finalDv, fuelFraction: finalDv / profile.deltaVBudgetKms });
      const name = target.name.toUpperCase();
      this.finishCourse('COMPLETE');
      store.pushNotice({ kind: 'info', title: `ARRIVED · ${name}`, lines: [`Transit time ${describeDuration(plan.travelTimeS)} of mission time.`], ttl: 6000 });
      this.audio.navTone();
      if (!store.discoveries[run.targetId]) this.identify(run.targetId);
      if (useStore.getState().selectedId === run.targetId) store.setPanel('object');
      if (isBody(obj)) this.rig.setDistance(Math.max(0.4, Math.min(this.rig.distance, run.holdDistanceVis * 0.45)));
    }
  }

  private updateManual(dt: number): void {
    const keys = this.input.keys;
    const fwd = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
    const strafe = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
    const lift = (keys.has('KeyR') ? 1 : 0) - (keys.has('KeyF') ? 1 : 0);
    const boost = keys.has('ShiftLeft') || keys.has('ShiftRight') ? 4 : 1;
    const thrusting = fwd !== 0 || strafe !== 0 || lift !== 0;

    if (thrusting && this.mode === 'HOLD') {
      this.mode = 'MANUAL';
      this.holdTargetId = null;
      useStore.getState().setSim({ flightMode: 'MANUAL' });
    }
    if (this.mode !== 'MANUAL') return;

    const scaleRef = this.nearestSurfaceDistance();
    const accel = THREE.MathUtils.clamp(scaleRef * 1.6, 0.25, 6000) * boost;
    const camFwd = this.rig.forward(this.tmpV);
    const camRight = this.tmpV2.crossVectors(camFwd, new THREE.Vector3(0, 1, 0)).normalize();
    const camUp = new THREE.Vector3().crossVectors(camRight, camFwd).normalize();
    if (thrusting) {
      this.shipVel.addScaledVector(camFwd, fwd * accel * dt);
      this.shipVel.addScaledVector(camRight, strafe * accel * dt);
      this.shipVel.addScaledVector(camUp, lift * accel * dt);
      this.desiredQuat.copy(quatFromForward(camFwd.clone()));
    }
    const maxSpeed = accel * 1.6;
    if (this.shipVel.length() > maxSpeed) this.shipVel.setLength(maxSpeed);
    this.shipVel.multiplyScalar(Math.exp(-dt * (thrusting ? 0.6 : 2.4)));
    this.shipPos.addScaledVector(this.shipVel, dt);
    this.thrustLevel = thrusting ? Math.min(1, 0.5 + 0.2 * boost) : Math.min(0.3, this.shipVel.length() / Math.max(maxSpeed, 1e-6));
  }

  private nearestSurfaceDistance(): number {
    let best = Infinity;
    for (const st of this.states.values()) {
      const d = eclToThree(st.visPos, this.tmpV).distanceTo(this.shipPos) - st.visRadius;
      if (d < best) best = d;
    }
    return Math.max(best, 0.02);
  }

  private resolveCollisions(): void {
    for (const st of this.states.values()) {
      const centre = eclToThree(st.visPos, this.tmpV);
      const minDist = st.visRadius * 1.06 + this.ship.length * 0.6;
      const dist = centre.distanceTo(this.shipPos);
      if (dist < minDist && dist > 1e-9) {
        const n = this.tmpV2.copy(this.shipPos).sub(centre).normalize();
        this.shipPos.copy(centre).addScaledVector(n, minDist);
        const vn = this.shipVel.dot(n);
        if (vn < 0) this.shipVel.addScaledVector(n, -vn);
      }
    }
  }

  private updateShipOrientation(dt: number): void {
    const k = 1 - Math.exp(-dt * (this.mode === 'COURSE' ? 4.5 : 3));
    this.shipQuat.slerp(this.desiredQuat, k);
  }

  private applyLevelOfDetail(camPos: THREE.Vector3): void {
    for (const view of this.views.values()) {
      const body = view.body;
      if (body.type !== 'Moon' || !body.parentId) continue;
      const parent = this.states.get(body.parentId)!;
      const dParent = eclToThree(parent.visPos, this.tmpV).distanceTo(camPos);
      view.setVisible(dParent < parent.influenceVis * 7);
    }
    this.ship.group.visible = this.rig.distance < 60;
  }

  private updateLabels(enabled: boolean): void {
    this.labels.setEnabled(enabled);
    if (!enabled) return;
    const store = useStore.getState();
    const cam = this.rig.camera;
    const frames: LabelFrame[] = [];
    for (const [id, view] of this.views) {
      const st = this.states.get(id)!;
      const body = view.body;
      let visible = view.root.visible;
      let weight = 1;
      if (body.type === 'Moon' && body.parentId) {
        const parent = this.states.get(body.parentId)!;
        const dParent = eclToThree(parent.visPos, this.tmpV).distanceTo(cam.position);
        visible = visible && dParent < parent.influenceVis * 3.2;
        weight = 0.9;
      } else if (body.type === 'DwarfPlanet') {
        weight = 0.75;
      }
      frames.push({ id, worldPos: view.root.position, visRadius: st.visRadius, visible, weight });
    }
    const hp = REGIONS.find((r) => r.id === 'heliopause')!;
    const nose = eclToThree(compressPoint(hp.targetPointAU!));
    frames.push({ id: hp.id, worldPos: nose, visRadius: 0.001, visible: this.rig.distance > 40 || store.zone === 'HELIOPAUSE_APPROACH' || store.zone === 'INTERSTELLAR_SPACE', weight: 0.8 });
    const showSky = store.interstellar || this.rig.distance > 2500;
    for (const s of this.skyLabels) {
      s.pos.copy(cam.position).addScaledVector(s.dir, SKY_RADIUS * 0.9);
      frames.push({ id: s.id, worldPos: s.pos, visRadius: 0.001, visible: showSky, weight: 0.7 });
    }
    this.labels.update(frames, cam, this.width, this.height);
  }

  private skyLabels: { id: string; dir: THREE.Vector3; pos: THREE.Vector3 }[] = [];

  private addSkyLabels(): void {
    const picks = this.stars.namedStars.filter((s) => s.mag < 1.2 || /Proxima|Alpha Centauri|Barnard|TRAPPIST|Sirius|Polaris/i.test(s.name)).slice(0, 18);
    for (const s of picks) {
      const id = `star:${s.name}`;
      this.labels.add({ id, name: s.name, sub: `${s.spectral} · ${s.distanceLy.toFixed(1)} ly`, tier: 'sky' });
      this.skyLabels.push({ id, dir: eclToThree(s.dir).normalize(), pos: new THREE.Vector3() });
    }
  }

  private pick(nx: number, ny: number): void {
    const cam = this.rig.camera;
    const px = (nx * 0.5 + 0.5) * this.width;
    const py = (-ny * 0.5 + 0.5) * this.height;
    const fovScale = (this.height / 2) / Math.tan((cam.fov * Math.PI) / 360);
    let bestId: string | null = null;
    let bestScore = Infinity;
    for (const [id, view] of this.views) {
      if (!view.root.visible) continue;
      const st = this.states.get(id)!;
      const p = this.tmpV.copy(view.root.position);
      const dist = p.distanceTo(cam.position);
      p.project(cam);
      if (p.z > 1) continue;
      const sx = (p.x * 0.5 + 0.5) * this.width;
      const sy = (-p.y * 0.5 + 0.5) * this.height;
      const rPx = (st.visRadius / dist) * fovScale;
      const dpx = Math.hypot(sx - px, sy - py);
      const radius = Math.max(rPx * 1.05, 18);
      if (dpx <= radius) {
        const score = dpx / radius + (rPx > this.height ? 1 : 0);
        if (score < bestScore) {
          bestScore = score;
          bestId = id;
        }
      }
    }
    if (bestId) this.select(bestId);
    else if (useStore.getState().selectedId) this.select(null);
  }

  private publishTelemetry(): void {
    const store = useStore.getState();
    const frame = this.eph.resolveFrame(threeToEcl(this.shipPos), this.states);
    const helioKm = vlen(frame.realPosAU) * AU_KM;
    const earth = this.states.get('earth')!;
    const lightToEarth = (vdist(frame.realPosAU, earth.realPosAU) * AU_KM) / C_KMS;
    const frameState = this.states.get(frame.frameId);
    const patch: Partial<typeof store.ship> = {
      helioDistanceKm: helioKm,
      frameBodyId: frame.frameId,
      realPosAU: frame.realPosAU,
      lightTimeToEarthS: lightToEarth,
      powerFraction: 0.94 - this.thrustLevel * 0.05 + 0.004 * Math.sin(this.time * 0.7),
      distanceToSelectedKm: store.selectedId ? this.realDistanceTo(store.selectedId, frame.realPosAU) : null,
      distanceToTargetKm: this.course ? this.realDistanceTo(this.course.targetId, frame.realPosAU) : null,
      nearestBodyId: frame.frameId,
    };
    if (this.mode !== 'COURSE') {
      const frameBody = BODY_BY_ID[frame.frameId];
      if (frame.frameId === 'sun' || !frameState) {
        patch.velocityKms = 0;
        patch.velocityFrame = this.mode === 'MANUAL' ? 'VISUAL NAV · NOT PHYSICAL' : 'REL. SUN';
      } else {
        patch.velocityKms = vlen(frameState.realVelKms);
        patch.velocityFrame = `REL. SUN · ${frameBody.name.toUpperCase()} FRAME`;
      }
      patch.accelerationMs2 = 0;
    }
    store.setTelemetry(patch);
    store.setSim({ simTime: this.simTime, effectiveTimeScale: this.mode === 'COURSE' && store.course ? store.course.effectiveTimeScale : store.timeScale });
    this.updateZone(helioKm / AU_KM);
  }

  private realDistanceTo(id: string, shipRealAU: Vec3): number | null {
    const obj = CATALOG_BY_ID[id];
    if (!obj) return null;
    if (isBody(obj)) {
      const st = this.states.get(id);
      return st ? vdist(shipRealAU, st.realPosAU) * AU_KM : null;
    }
    if (isRegion(obj)) {
      const r = obj as Region;
      if (r.targetPointAU) return vdist(shipRealAU, r.targetPointAU) * AU_KM;
      const rr = vlen(shipRealAU);
      if (rr >= r.innerAU && rr <= r.outerAU) return 0;
      return Math.min(Math.abs(rr - r.innerAU), Math.abs(rr - r.outerAU)) * AU_KM;
    }
    if ('distanceKm' in obj) return obj.distanceKm;
    return null;
  }

  private checkDiscoveries(): void {
    const store = useStore.getState();
    const shipReal = store.ship.realPosAU;
    for (const b of BODIES) {
      if (store.discoveries[b.id]) continue;
      const st = this.states.get(b.id)!;
      const dKm = vdist(shipReal, st.realPosAU) * AU_KM;
      const threshold = Math.max(b.radiusKm * 30, 250_000);
      if (dKm < threshold) {
        this.identify(b.id);
        break;
      }
    }
    const rAU = vlen(shipReal);
    for (const r of REGIONS) {
      if (store.discoveries[r.id]) continue;
      const inside = r.kind === 'boundary' ? rAU >= r.innerAU : rAU >= r.innerAU && rAU <= r.outerAU;
      if (inside) {
        this.identify(r.id);
        break;
      }
    }
  }

  private identify(id: string): void {
    const store = useStore.getState();
    const obj = CATALOG_BY_ID[id];
    if (!obj) return;
    const entry = store.addDiscovery(id, this.simTime);
    if (!entry) return;
    const lines = [`DISCOVERY #${String(entry.index).padStart(3, '0')} · ${obj.classLabel}`];
    if (obj.biologicalInterest === 'HIGH') lines.push('BIOLOGICAL INTEREST · HIGH');
    store.pushNotice({ kind: 'identify', title: `OBJECT IDENTIFIED · ${obj.name.toUpperCase()}`, lines, ttl: 7000 });
    this.audio.identify();
    setTimeout(() => this.audio.discovery(), 500);
    if (!store.selectedId && this.mode !== 'COURSE') this.select(id);
  }

  private updateZone(rAU: number): void {
    const next: RegionZone =
      rAU < 2.2 ? 'INNER_SYSTEM' : rAU < 31 ? 'PLANETARY_REGION' : rAU < 55 ? 'KUIPER_BELT' : rAU < 100 ? 'OUTER_SOLAR_SYSTEM' : rAU < 120 ? 'HELIOPAUSE_APPROACH' : 'INTERSTELLAR_SPACE';
    if (next === this.zone) return;
    const order: RegionZone[] = ['INNER_SYSTEM', 'PLANETARY_REGION', 'KUIPER_BELT', 'OUTER_SOLAR_SYSTEM', 'HELIOPAUSE_APPROACH', 'INTERSTELLAR_SPACE'];
    const outward = order.indexOf(next) > order.indexOf(this.zone);
    this.zone = next;
    const store = useStore.getState();
    store.setSim({ zone: next, interstellar: next === 'INTERSTELLAR_SPACE' });
    if (store.phase !== 'flight') return;
    if (next === 'INTERSTELLAR_SPACE' && outward) {
      store.pushNotice({ kind: 'milestone', title: 'SOLAR SYSTEM EXITED', lines: ['INTERSTELLAR SPACE', 'The Sun is now one star among many.', 'Its gravity still reaches a thousand times farther.'], ttl: 14000 });
      this.audio.milestone();
    } else if (outward) {
      const titles: Record<RegionZone, string> = {
        INNER_SYSTEM: 'INNER SYSTEM',
        PLANETARY_REGION: 'PLANETARY REGION',
        KUIPER_BELT: 'KUIPER BELT',
        OUTER_SOLAR_SYSTEM: 'OUTER SOLAR SYSTEM',
        HELIOPAUSE_APPROACH: 'HELIOPAUSE APPROACH',
        INTERSTELLAR_SPACE: 'INTERSTELLAR SPACE',
      };
      store.pushNotice({ kind: next === 'HELIOPAUSE_APPROACH' ? 'warning' : 'info', title: titles[next], lines: next === 'HELIOPAUSE_APPROACH' ? ['Solar wind stalling against the interstellar medium.'] : undefined, ttl: 6000 });
      this.audio.blip(520, 0.3, 0.04, 'triangle');
    } else {
      store.pushNotice({ kind: 'info', title: next.replace(/_/g, ' '), ttl: 3500 });
    }
  }

  private trackPerformance(dt: number): void {
    this.frameTimes.push(dt);
    if (this.frameTimes.length < 120) return;
    const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    this.frameTimes = [];
    if (avg > 0.028 && this.pixelRatioCap > 1) {
      this.pixelRatioCap = 1;
      this.resize();
    }
  }
}

// ───────────────────────────── helpers ─────────────────────────────

const FORWARD = new THREE.Vector3(0, 0, 1);
const UP = new THREE.Vector3(0, 1, 0);
const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();

/** Quaternion that points the ship's +Z forward axis along `dir` with +Y up. */
function quatFromForward(dir: THREE.Vector3): THREE.Quaternion {
  const f = dir.clone().normalize();
  if (Math.abs(f.dot(UP)) > 0.999) {
    return tmpQ.setFromUnitVectors(FORWARD, f).clone();
  }
  tmpM.lookAt(f, new THREE.Vector3(0, 0, 0), UP);
  return tmpQ.setFromRotationMatrix(tmpM).clone();
}

function progressAlong(plan: CourseRun['plan'], simElapsed: number): number {
  if (!Number.isFinite(plan.travelTimeS) || plan.travelTimeS <= 0) return 1;
  const dm = plan.distanceKm * 1000;
  if (dm <= 0) return 1;
  const t = Math.min(plan.travelTimeS, Math.max(0, simElapsed));
  if (plan.mode === 'CRUISE_FLYBY') return t / plan.travelTimeS;
  const a = plan.accelerationMs2;
  const vPeak = plan.peakVelocityKms * 1000;
  let dist: number;
  if (t < plan.accelTimeS) dist = 0.5 * a * t * t;
  else {
    dist = 0.5 * a * plan.accelTimeS * plan.accelTimeS;
    const tc = Math.min(t - plan.accelTimeS, plan.coastTimeS);
    dist += vPeak * tc;
    const td = t - plan.accelTimeS - plan.coastTimeS;
    if (td > 0) dist += vPeak * td - 0.5 * a * td * td;
  }
  return THREE.MathUtils.clamp(dist / dm, 0, 1);
}

function compressPoint(p: [number, number, number]): Vec3 {
  const r = Math.hypot(p[0], p[1], p[2]);
  if (r === 0) return [0, 0, 0];
  const rv = 100 * Math.pow(r, 0.56);
  return [(p[0] / r) * rv, (p[1] / r) * rv, (p[2] / r) * rv];
}

function describeDuration(s: number): string {
  const days = s / 86400;
  if (days < 1) return `${(s / 3600).toFixed(1)} hours`;
  if (days < 365) return `${days.toFixed(0)} days`;
  return `${(days / 365.25).toFixed(1)} years`;
}

function labelTier(b: CelestialBody): 'star' | 'planet' | 'moon' | 'dwarf' {
  if (b.type === 'Star') return 'star';
  if (b.type === 'Moon') return 'moon';
  if (b.type === 'DwarfPlanet') return 'dwarf';
  return 'planet';
}

