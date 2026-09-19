/**
 * Keyboard, mouse, wheel and touch input for the exploration camera and manual flight.
 * The engine polls `keys`, `dragDelta`, `wheelDelta` each frame and consumes clicks.
 */
export interface ClickEvent {
  x: number; // NDC -1..1
  y: number;
}

export class Input {
  readonly keys = new Set<string>();
  dragDX = 0;
  dragDY = 0;
  wheel = 0;
  pinchScale = 1;
  private dragging = false;
  private moved = 0;
  private lastX = 0;
  private lastY = 0;
  private click: ClickEvent | null = null;
  private lastTouchDist = 0;
  private readonly el: HTMLElement;
  private gestureListeners: (() => void)[] = [];
  private gestured = false;

  constructor(el: HTMLElement) {
    this.el = el;
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', () => this.keys.clear());
    el.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    el.addEventListener('wheel', this.onWheel, { passive: false });
    el.addEventListener('touchstart', this.onTouchStart, { passive: true });
    el.addEventListener('touchmove', this.onTouchMove, { passive: false });
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  /** Register a callback for the first user gesture (needed to unlock audio). */
  onFirstGesture(cb: () => void): void {
    if (this.gestured) cb();
    else this.gestureListeners.push(cb);
  }

  private fireGesture(): void {
    if (this.gestured) return;
    this.gestured = true;
    this.gestureListeners.forEach((cb) => cb());
    this.gestureListeners = [];
  }

  private isTypingTarget(e: KeyboardEvent): boolean {
    const t = e.target as HTMLElement | null;
    return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (this.isTypingTarget(e)) return;
    this.fireGesture();
    this.keys.add(e.code);
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  private onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    this.fireGesture();
    this.dragging = true;
    this.moved = 0;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
  };

  private onPointerMove = (e: PointerEvent) => {
    if (!this.dragging) return;
    const dx = e.clientX - this.lastX;
    const dy = e.clientY - this.lastY;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.moved += Math.abs(dx) + Math.abs(dy);
    this.dragDX += dx;
    this.dragDY += dy;
  };

  private onPointerUp = (e: PointerEvent) => {
    if (!this.dragging) return;
    this.dragging = false;
    if (this.moved < 6 && e.target === this.el) {
      const rect = this.el.getBoundingClientRect();
      this.click = {
        x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
        y: -((e.clientY - rect.top) / rect.height) * 2 + 1,
      };
    }
  };

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    this.fireGesture();
    const unit = e.deltaMode === 1 ? 32 : e.deltaMode === 2 ? 400 : 1;
    this.wheel += e.deltaY * unit;
  };

  private onTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 2) {
      this.lastTouchDist = touchDist(e);
    }
  };

  private onTouchMove = (e: TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const d = touchDist(e);
      if (this.lastTouchDist > 0) this.wheel += (this.lastTouchDist - d) * 4;
      this.lastTouchDist = d;
      this.dragging = false;
    }
  };

  consumeClick(): ClickEvent | null {
    const c = this.click;
    this.click = null;
    return c;
  }

  /** Read and reset per-frame deltas. */
  consumeDeltas(): { dx: number; dy: number; wheel: number } {
    const out = { dx: this.dragDX, dy: this.dragDY, wheel: this.wheel };
    this.dragDX = 0;
    this.dragDY = 0;
    this.wheel = 0;
    return out;
  }

  get isDragging(): boolean {
    return this.dragging;
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.el.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    this.el.removeEventListener('wheel', this.onWheel);
    this.el.removeEventListener('touchstart', this.onTouchStart);
    this.el.removeEventListener('touchmove', this.onTouchMove);
  }
}

function touchDist(e: TouchEvent): number {
  const a = e.touches[0];
  const b = e.touches[1];
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}
