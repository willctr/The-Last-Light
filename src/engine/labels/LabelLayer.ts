import * as THREE from 'three';

export interface LabelSpec {
  id: string;
  name: string;
  sub: string;
  tier: 'star' | 'planet' | 'moon' | 'dwarf' | 'region' | 'sky';
}

export interface LabelFrame {
  id: string;
  worldPos: THREE.Vector3;
  visRadius: number;
  visible: boolean;
  /** 0..1 extra dimming. */
  weight: number;
}

/**
 * DOM label overlay. Labels are positioned imperatively each frame (no React re-renders),
 * offset beyond the body's projected disc, and hidden when the body fills the view.
 */
export class LabelLayer {
  readonly root: HTMLDivElement;
  private readonly els = new Map<string, HTMLDivElement>();
  private readonly tmp = new THREE.Vector3();
  private onSelect: (id: string) => void = () => {};
  private selectedId: string | null = null;
  private enabled = true;

  constructor(container: HTMLElement) {
    this.root = document.createElement('div');
    this.root.className = 'label-layer';
    container.appendChild(this.root);
  }

  setSelectHandler(fn: (id: string) => void): void {
    this.onSelect = fn;
  }

  setSelected(id: string | null): void {
    if (this.selectedId && this.els.get(this.selectedId)) this.els.get(this.selectedId)!.classList.remove('selected');
    this.selectedId = id;
    if (id && this.els.get(id)) this.els.get(id)!.classList.add('selected');
  }

  setEnabled(v: boolean): void {
    this.enabled = v;
    if (!v) this.els.forEach((el) => (el.style.display = 'none'));
  }

  add(spec: LabelSpec): void {
    const el = document.createElement('div');
    el.className = `label tier-${spec.tier}`;
    el.innerHTML = `<span class="label-dot"></span><span class="label-text"><span class="label-name">${spec.name}</span><span class="label-sub">${spec.sub}</span></span>`;
    el.style.display = 'none';
    el.addEventListener('pointerdown', (e) => e.stopPropagation());
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onSelect(spec.id);
    });
    this.root.appendChild(el);
    this.els.set(spec.id, el);
  }

  update(frames: LabelFrame[], camera: THREE.PerspectiveCamera, width: number, height: number): void {
    if (!this.enabled) return;
    const fovScale = (height / 2) / Math.tan((camera.fov * Math.PI) / 360);
    const camPos = camera.position;
    for (const f of frames) {
      const el = this.els.get(f.id);
      if (!el) continue;
      if (!f.visible) {
        el.style.display = 'none';
        continue;
      }
      const dist = camPos.distanceTo(f.worldPos);
      const rPx = (f.visRadius / Math.max(dist, 1e-6)) * fovScale;
      if (rPx > height * 0.42) {
        el.style.display = 'none';
        continue;
      }
      this.tmp.copy(f.worldPos).project(camera);
      if (this.tmp.z > 1 || Math.abs(this.tmp.x) > 1.15 || Math.abs(this.tmp.y) > 1.15) {
        el.style.display = 'none';
        continue;
      }
      const x = (this.tmp.x * 0.5 + 0.5) * width;
      const y = (-this.tmp.y * 0.5 + 0.5) * height;
      const off = Math.min(rPx, height * 0.4) * 0.72 + 9;
      el.style.display = '';
      el.style.transform = `translate3d(${(x + off).toFixed(1)}px, ${(y - off * 0.55).toFixed(1)}px, 0)`;
      el.style.opacity = String(Math.max(0, Math.min(1, f.weight)));
    }
  }

  dispose(): void {
    this.root.remove();
  }
}
