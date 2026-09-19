/**
 * Shared application state (zustand). The engine writes telemetry at a throttled rate and
 * reads commands; React UI reads state and issues commands through the engine bridge.
 */
import { create } from 'zustand';
import type { DiscoveryEntry } from '@/data/types';
import type { TransferPlan } from '@/science/transfer';
import type { Vec3 } from '@/science/vec3';
import { AURORA_DEFAULT_PROPULSION_ID, AURORA_DELTA_V_KMS } from '@/data/propulsion/profiles';

export type Phase = 'boot' | 'flight';
export type FlightMode = 'MANUAL' | 'COURSE' | 'HOLD';
export type RegionZone = 'INNER_SYSTEM' | 'PLANETARY_REGION' | 'OUTER_SOLAR_SYSTEM' | 'KUIPER_BELT' | 'HELIOPAUSE_APPROACH' | 'INTERSTELLAR_SPACE';
export type PanelKind = 'object' | 'learn' | 'course' | 'log' | 'scale' | 'help' | 'propulsion' | 'navdb' | null;

export const TIME_SCALES = [1, 10, 100, 1_000, 10_000, 100_000, 1_000_000] as const;

export interface ShipTelemetry {
  /** Displayed speed (km/s) and what it is relative to. */
  velocityKms: number;
  velocityFrame: string;
  accelerationMs2: number;
  fuelFraction: number;
  deltaVRemainingKms: number;
  powerFraction: number;
  propulsionId: string;
  /** Distance from the Sun, km. */
  helioDistanceKm: number;
  /** Body whose local frame the ship is in. */
  frameBodyId: string;
  realPosAU: Vec3;
  /** One-way light time to Earth, seconds. */
  lightTimeToEarthS: number;
  /** Real distance (km) from the ship to the selected object, if any. */
  distanceToSelectedKm: number | null;
  /** Real distance (km) from the ship to the course target, if any. */
  distanceToTargetKm: number | null;
  /** Fraction of visual radius the nearest body subtends — used to fade HUD. */
  nearestBodyId: string | null;
}

export interface CourseState {
  targetId: string;
  plan: TransferPlan;
  status: 'PLANNED' | 'ENGAGED' | 'COMPLETE' | 'ABORTED';
  /** Real-time seconds the visual flight takes. */
  durationRealS: number;
  /** Effective simulation-time multiplier while engaged. */
  effectiveTimeScale: number;
  /** 0..1 along the transfer. */
  progress: number;
  /** Simulation time (s since J2000) at departure and arrival. */
  departSimTime: number;
  arriveSimTime: number;
  /** Straight-line separation from the target at planning time, for comparison with the transfer distance. */
  currentSeparationKm: number;
}

export type NoticeKind = 'info' | 'identify' | 'warning' | 'milestone' | 'scan';

export interface Notice {
  id: number;
  kind: NoticeKind;
  title: string;
  lines?: string[];
  /** Milliseconds to live. */
  ttl: number;
  createdAt: number;
}

export interface ScanState {
  objectId: string;
  progress: number;
}

export interface AppState {
  phase: Phase;
  bootStep: number;
  simTime: number;
  missionStartSimTime: number;
  timeScale: number;
  paused: boolean;
  effectiveTimeScale: number;
  flightMode: FlightMode;
  zone: RegionZone;
  ship: ShipTelemetry;
  selectedId: string | null;
  course: CourseState | null;
  discoveries: Record<string, DiscoveryEntry>;
  discoveryOrder: string[];
  scan: ScanState | null;
  notices: Notice[];
  panel: PanelKind;
  showOrbits: boolean;
  showLabels: boolean;
  muted: boolean;
  cameraDistance: number;
  interstellar: boolean;

  // actions
  setPhase: (p: Phase) => void;
  setBootStep: (s: number) => void;
  setTimeScale: (s: number) => void;
  stepTimeScale: (dir: 1 | -1) => void;
  togglePaused: () => void;
  select: (id: string | null) => void;
  setPanel: (p: PanelKind) => void;
  togglePanel: (p: PanelKind) => void;
  pushNotice: (n: Omit<Notice, 'id' | 'createdAt'>) => void;
  expireNotices: (now: number) => void;
  addDiscovery: (objectId: string, simTime: number) => DiscoveryEntry | null;
  markScanned: (objectId: string) => void;
  setScan: (s: ScanState | null) => void;
  setCourse: (c: CourseState | null) => void;
  updateCourse: (patch: Partial<CourseState>) => void;
  setTelemetry: (patch: Partial<ShipTelemetry>) => void;
  setSim: (patch: Partial<Pick<AppState, 'simTime' | 'effectiveTimeScale' | 'flightMode' | 'zone' | 'cameraDistance' | 'interstellar'>>) => void;
  toggleOrbits: () => void;
  toggleLabels: () => void;
  toggleMuted: () => void;
  resetSimulation: () => void;
}

let noticeSeq = 1;

const initialTelemetry = (): ShipTelemetry => ({
  velocityKms: 0,
  velocityFrame: 'REL. SUN',
  accelerationMs2: 0,
  fuelFraction: 1,
  deltaVRemainingKms: AURORA_DELTA_V_KMS,
  powerFraction: 0.94,
  propulsionId: AURORA_DEFAULT_PROPULSION_ID,
  helioDistanceKm: 0,
  frameBodyId: 'earth',
  realPosAU: [0, 0, 0],
  lightTimeToEarthS: 0,
  distanceToSelectedKm: null,
  distanceToTargetKm: null,
  nearestBodyId: null,
});

export const useStore = create<AppState>((set, get) => ({
  phase: 'boot',
  bootStep: 0,
  simTime: 0,
  missionStartSimTime: 0,
  timeScale: 1,
  paused: false,
  effectiveTimeScale: 1,
  flightMode: 'HOLD',
  zone: 'INNER_SYSTEM',
  ship: initialTelemetry(),
  selectedId: null,
  course: null,
  discoveries: {},
  discoveryOrder: [],
  scan: null,
  notices: [],
  panel: null,
  showOrbits: true,
  showLabels: true,
  muted: false,
  cameraDistance: 0.6,
  interstellar: false,

  setPhase: (phase) => set({ phase }),
  setBootStep: (bootStep) => set({ bootStep }),
  setTimeScale: (timeScale) => set({ timeScale, paused: false }),
  stepTimeScale: (dir) => {
    const { timeScale } = get();
    const idx = TIME_SCALES.indexOf(timeScale as (typeof TIME_SCALES)[number]);
    const next = Math.max(0, Math.min(TIME_SCALES.length - 1, (idx < 0 ? 0 : idx) + dir));
    set({ timeScale: TIME_SCALES[next], paused: false });
  },
  togglePaused: () => set((s) => ({ paused: !s.paused })),
  select: (selectedId) => set((s) => ({ selectedId, panel: selectedId ? (s.panel === 'learn' ? 'learn' : 'object') : s.panel === 'object' || s.panel === 'learn' ? null : s.panel })),
  setPanel: (panel) => set({ panel }),
  togglePanel: (panel) => set((s) => ({ panel: s.panel === panel ? null : panel })),
  pushNotice: (n) =>
    set((s) => ({
      notices: [...s.notices.filter((x) => !(x.kind === n.kind && x.title === n.title)), { ...n, id: noticeSeq++, createdAt: performance.now() }].slice(-5),
    })),
  expireNotices: (now) => {
    const { notices } = get();
    const keep = notices.filter((n) => now - n.createdAt < n.ttl);
    if (keep.length !== notices.length) set({ notices: keep });
  },
  addDiscovery: (objectId, simTime) => {
    const { discoveries, discoveryOrder } = get();
    if (discoveries[objectId]) return null;
    const entry: DiscoveryEntry = { objectId, index: discoveryOrder.length + 1, simTime, scanned: false };
    set({ discoveries: { ...discoveries, [objectId]: entry }, discoveryOrder: [...discoveryOrder, objectId] });
    return entry;
  },
  markScanned: (objectId) =>
    set((s) => (s.discoveries[objectId] ? { discoveries: { ...s.discoveries, [objectId]: { ...s.discoveries[objectId], scanned: true } } } : {})),
  setScan: (scan) => set({ scan }),
  setCourse: (course) => set({ course }),
  updateCourse: (patch) => set((s) => (s.course ? { course: { ...s.course, ...patch } } : {})),
  setTelemetry: (patch) => set((s) => ({ ship: { ...s.ship, ...patch } })),
  setSim: (patch) => set(patch),
  toggleOrbits: () => set((s) => ({ showOrbits: !s.showOrbits })),
  toggleLabels: () => set((s) => ({ showLabels: !s.showLabels })),
  toggleMuted: () => set((s) => ({ muted: !s.muted })),
  resetSimulation: () =>
    set({
      course: null,
      scan: null,
      flightMode: 'HOLD',
      timeScale: 1,
      paused: false,
      effectiveTimeScale: 1,
      selectedId: null,
      panel: null,
      ship: initialTelemetry(),
      interstellar: false,
    }),
}));

export const selectDiscoveryCount = (s: AppState): number => s.discoveryOrder.length;
