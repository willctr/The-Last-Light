import * as THREE from 'three';

/**
 * AURORA-01: a procedural exploration vessel. Long truss, forward habitat and sensor module,
 * high-gain dish, twin radiator panels, reactor at the stern behind a shadow shield, and a
 * cluster of electric thrusters. No weapons. Length ≈ 0.14 visual units.
 */
export class ShipModel {
  readonly group = new THREE.Group();
  readonly engineGlow: THREE.Sprite;
  readonly length = 0.14;
  private readonly radiatorMat: THREE.MeshStandardMaterial;
  private readonly navRed: THREE.Mesh;
  private readonly navGreen: THREE.Mesh;
  private readonly strobe: THREE.Mesh;
  private thrust = 0;

  constructor() {
    // A faint self-illumination keeps the hull legible against bright planets and in deep shadow.
    const hull = new THREE.MeshStandardMaterial({ color: 0xb9bec7, metalness: 0.7, roughness: 0.45, emissive: new THREE.Color(0x1a2230), emissiveIntensity: 0.6 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x3a3f48, metalness: 0.6, roughness: 0.6, emissive: new THREE.Color(0x0c1018), emissiveIntensity: 0.6 });
    const gold = new THREE.MeshStandardMaterial({ color: 0xc9a25a, metalness: 0.9, roughness: 0.35 });
    this.radiatorMat = new THREE.MeshStandardMaterial({ color: 0x2a2226, metalness: 0.3, roughness: 0.8, emissive: new THREE.Color(0x3a0a06), emissiveIntensity: 0.2 });

    const L = this.length;
    // truss along +Z (forward = -Z in three convention? we define forward = +Z local, and orient the group)
    const truss = new THREE.Mesh(new THREE.CylinderGeometry(L * 0.025, L * 0.025, L * 0.62, 8), dark);
    truss.rotation.x = Math.PI / 2;
    truss.position.z = -L * 0.02;
    this.group.add(truss);

    const habitat = new THREE.Mesh(new THREE.CapsuleGeometry(L * 0.075, L * 0.16, 6, 14), hull);
    habitat.rotation.x = Math.PI / 2;
    habitat.position.z = L * 0.36;
    this.group.add(habitat);

    const sensor = new THREE.Mesh(new THREE.CylinderGeometry(L * 0.02, L * 0.035, L * 0.1, 8), gold);
    sensor.rotation.x = Math.PI / 2;
    sensor.position.z = L * 0.5;
    this.group.add(sensor);

    const dish = new THREE.Mesh(new THREE.ConeGeometry(L * 0.11, L * 0.04, 24, 1, true), hull);
    dish.rotation.x = -Math.PI / 2 + 0.5;
    dish.position.set(L * 0.1, L * 0.05, L * 0.22);
    this.group.add(dish);
    const dishMast = new THREE.Mesh(new THREE.CylinderGeometry(L * 0.006, L * 0.006, L * 0.12, 6), dark);
    dishMast.position.set(L * 0.05, L * 0.03, L * 0.22);
    dishMast.rotation.z = -0.9;
    this.group.add(dishMast);

    for (const side of [-1, 1]) {
      const rad = new THREE.Mesh(new THREE.BoxGeometry(L * 0.42, L * 0.006, L * 0.2), this.radiatorMat);
      rad.position.set(side * L * 0.24, 0, -L * 0.05);
      this.group.add(rad);
    }

    const shield = new THREE.Mesh(new THREE.CylinderGeometry(L * 0.07, L * 0.05, L * 0.03, 16), dark);
    shield.rotation.x = Math.PI / 2;
    shield.position.z = -L * 0.3;
    this.group.add(shield);

    const reactor = new THREE.Mesh(new THREE.CylinderGeometry(L * 0.05, L * 0.05, L * 0.12, 16), hull);
    reactor.rotation.x = Math.PI / 2;
    reactor.position.z = -L * 0.38;
    this.group.add(reactor);

    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const t = new THREE.Mesh(new THREE.CylinderGeometry(L * 0.012, L * 0.02, L * 0.05, 10), dark);
      t.rotation.x = Math.PI / 2;
      t.position.set(Math.cos(a) * L * 0.03, Math.sin(a) * L * 0.03, -L * 0.47);
      this.group.add(t);
    }

    const glowMat = new THREE.SpriteMaterial({
      color: new THREE.Color(0.45, 0.7, 1.0),
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      map: makeGlowTexture(),
    });
    this.engineGlow = new THREE.Sprite(glowMat);
    this.engineGlow.position.z = -L * 0.52;
    this.engineGlow.scale.setScalar(L * 0.25);
    this.group.add(this.engineGlow);

    const lightGeo = new THREE.SphereGeometry(L * 0.012, 8, 8);
    this.navRed = new THREE.Mesh(lightGeo, new THREE.MeshBasicMaterial({ color: 0xff3020 }));
    this.navRed.position.set(-L * 0.45, L * 0.01, -L * 0.05);
    this.navGreen = new THREE.Mesh(lightGeo, new THREE.MeshBasicMaterial({ color: 0x30ff60 }));
    this.navGreen.position.set(L * 0.45, L * 0.01, -L * 0.05);
    this.strobe = new THREE.Mesh(lightGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }));
    this.strobe.position.set(0, L * 0.09, L * 0.36);
    this.group.add(this.navRed, this.navGreen, this.strobe);
  }

  setThrust(level: number): void {
    this.thrust = Math.max(0, Math.min(1, level));
  }

  update(time: number): void {
    const glow = this.engineGlow.material as THREE.SpriteMaterial;
    glow.opacity += (this.thrust * 0.95 - glow.opacity) * 0.1;
    const flicker = 1 + 0.12 * Math.sin(time * 37) * this.thrust;
    this.engineGlow.scale.setScalar(this.length * (0.22 + this.thrust * 0.5) * flicker);
    this.radiatorMat.emissiveIntensity = 0.15 + this.thrust * 0.9;
    const blink = (time % 2) < 0.08;
    (this.strobe.material as THREE.MeshBasicMaterial).color.setScalar(blink ? 2 : 0.15);
    const slow = (time % 1.2) < 0.6;
    (this.navRed.material as THREE.MeshBasicMaterial).color.setRGB(slow ? 1.2 : 0.35, 0.12, 0.08);
    (this.navGreen.material as THREE.MeshBasicMaterial).color.setRGB(0.1, slow ? 1.2 : 0.35, 0.25);
  }
}

function makeGlowTexture(): THREE.Texture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(180,220,255,0.8)');
  g.addColorStop(0.6, 'rgba(90,150,255,0.25)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
