/**
 * Procedural ambient audio: no assets. A barely-audible reactor hum, a low airless drone,
 * navigation blips, a scanning sweep, a discovery chime and a warning tone. Everything is
 * quiet by design; the experience is complete when muted.
 */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private humGain: GainNode | null = null;
  private thrustGain: GainNode | null = null;
  private thrustFilter: BiquadFilterNode | null = null;
  private scanOsc: OscillatorNode | null = null;
  private scanGain: GainNode | null = null;
  private muted = false;
  private started = false;

  /** Must be called from a user gesture. */
  start(): void {
    if (this.started) return;
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    this.started = true;
    const ctx = new Ctx();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.5;
    this.master.connect(ctx.destination);

    // Reactor hum: two detuned low oscillators through a gentle low-pass, with slow LFO breathing.
    this.humGain = ctx.createGain();
    this.humGain.gain.value = 0.0;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 140;
    lp.Q.value = 0.7;
    for (const [freq, type] of [[54, 'sawtooth'], [54.6, 'triangle'], [108.3, 'sine']] as [number, OscillatorType][]) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.value = type === 'sine' ? 0.25 : 0.5;
      o.connect(g).connect(lp);
      o.start();
    }
    lp.connect(this.humGain).connect(this.master);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.012;
    lfo.connect(lfoGain).connect(this.humGain.gain);
    lfo.start();
    this.humGain.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 6);

    // Deep drone: filtered brown noise.
    const noise = this.makeNoiseBuffer(ctx, 4, 'brown');
    const src = ctx.createBufferSource();
    src.buffer = noise;
    src.loop = true;
    const nlp = ctx.createBiquadFilter();
    nlp.type = 'lowpass';
    nlp.frequency.value = 90;
    const ng = ctx.createGain();
    ng.gain.value = 0.0;
    ng.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 8);
    src.connect(nlp).connect(ng).connect(this.master);
    src.start();

    // Thruster: band-passed noise whose gain follows thrust level.
    const tsrc = ctx.createBufferSource();
    tsrc.buffer = this.makeNoiseBuffer(ctx, 3, 'white');
    tsrc.loop = true;
    this.thrustFilter = ctx.createBiquadFilter();
    this.thrustFilter.type = 'bandpass';
    this.thrustFilter.frequency.value = 220;
    this.thrustFilter.Q.value = 1.4;
    this.thrustGain = ctx.createGain();
    this.thrustGain.gain.value = 0;
    tsrc.connect(this.thrustFilter).connect(this.thrustGain).connect(this.master);
    tsrc.start();
  }

  setMuted(m: boolean): void {
    this.muted = m;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.5, this.ctx.currentTime, 0.05);
  }

  resume(): void {
    if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
  }

  setThrust(level: number): void {
    if (!this.thrustGain || !this.ctx || !this.thrustFilter) return;
    const t = this.ctx.currentTime;
    this.thrustGain.gain.setTargetAtTime(Math.max(0, Math.min(1, level)) * 0.07, t, 0.3);
    this.thrustFilter.frequency.setTargetAtTime(180 + level * 260, t, 0.5);
  }

  blip(freq = 880, duration = 0.08, gain = 0.08, type: OscillatorType = 'sine'): void {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + duration + 0.05);
  }

  navTone(): void {
    this.blip(1046, 0.06, 0.05);
    setTimeout(() => this.blip(1318, 0.08, 0.04), 70);
  }

  identify(): void {
    this.blip(660, 0.12, 0.05, 'triangle');
    setTimeout(() => this.blip(990, 0.16, 0.045, 'triangle'), 120);
  }

  discovery(): void {
    if (!this.ctx || !this.master) return;
    const notes = [523.25, 783.99, 1046.5];
    notes.forEach((f, i) => setTimeout(() => this.blip(f, 0.9, 0.05, 'sine'), i * 140));
  }

  milestone(): void {
    if (!this.ctx || !this.master) return;
    const notes = [196, 293.66, 392, 587.33];
    notes.forEach((f, i) => setTimeout(() => this.blip(f, 2.4, 0.045, 'triangle'), i * 260));
  }

  warning(): void {
    this.blip(220, 0.25, 0.07, 'square');
    setTimeout(() => this.blip(196, 0.3, 0.06, 'square'), 300);
  }

  scanStart(): void {
    if (!this.ctx || !this.master || this.scanOsc) return;
    const t = this.ctx.currentTime;
    this.scanOsc = this.ctx.createOscillator();
    this.scanOsc.type = 'sine';
    this.scanOsc.frequency.setValueAtTime(320, t);
    this.scanOsc.frequency.linearRampToValueAtTime(1400, t + 2.6);
    this.scanGain = this.ctx.createGain();
    this.scanGain.gain.setValueAtTime(0, t);
    this.scanGain.gain.linearRampToValueAtTime(0.035, t + 0.2);
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 9;
    const lg = this.ctx.createGain();
    lg.gain.value = 0.02;
    lfo.connect(lg).connect(this.scanGain.gain);
    lfo.start(t);
    lfo.stop(t + 3);
    this.scanOsc.connect(this.scanGain).connect(this.master);
    this.scanOsc.start(t);
  }

  scanStop(): void {
    if (!this.ctx || !this.scanOsc || !this.scanGain) return;
    const t = this.ctx.currentTime;
    this.scanGain.gain.setTargetAtTime(0, t, 0.08);
    this.scanOsc.stop(t + 0.4);
    this.scanOsc = null;
    this.scanGain = null;
    this.blip(1568, 0.25, 0.04);
  }

  private makeNoiseBuffer(ctx: AudioContext, seconds: number, kind: 'white' | 'brown'): AudioBuffer {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (kind === 'white') data[i] = w;
      else {
        last = (last + 0.02 * w) / 1.02;
        data[i] = last * 3.5;
      }
    }
    return buf;
  }
}
