import { useEffect, useState } from 'react';
import { useStore } from '@/state/store';
import { getEngine } from '@/engine/bridge';

const LINES = ['INITIALIZING AURORA-01', 'SYSTEMS ONLINE', 'NAVIGATION ONLINE', 'SCIENCE DATABASE ONLINE'];

/**
 * Opening sequence: black → stars → ship → title → boot lines → HUD. The engine handles the
 * camera drift and star fade; this component only times the text. Click or press a key to skip.
 */
export function Boot() {
  const setPhase = useStore((s) => s.setPhase);
  const [step, setStep] = useState(0); // 0 dark, 1 title, 2.. lines, 6 fade
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const timeline: [number, () => void][] = [
      [3200, () => setStep(1)],
      [6800, () => setStep(2)],
      [7900, () => setStep(3)],
      [8900, () => setStep(4)],
      [9900, () => setStep(5)],
      [11600, () => finish()],
    ];
    const handles = timeline.map(([t, fn]) => window.setTimeout(fn, t));
    const skip = (e: Event) => {
      if (e instanceof KeyboardEvent && (e.metaKey || e.ctrlKey)) return;
      getEngine()?.unlockAudio();
      finish();
    };
    window.addEventListener('keydown', skip);
    window.addEventListener('pointerdown', skip);
    let done = false;
    function finish() {
      if (done) return;
      done = true;
      handles.forEach(clearTimeout);
      window.removeEventListener('keydown', skip);
      window.removeEventListener('pointerdown', skip);
      setFading(true);
      window.setTimeout(() => {
        setPhase('flight');
        getEngine()?.beginFlight();
      }, 1300);
    }
    return () => {
      handles.forEach(clearTimeout);
      window.removeEventListener('keydown', skip);
      window.removeEventListener('pointerdown', skip);
    };
  }, [setPhase]);

  return (
    <div className={`boot ${fading ? 'boot-fade' : ''}`}>
      <div className="boot-inner">
        {step >= 1 && (
          <>
            <h1>THE LAST LIGHT</h1>
            <div className="tag-line">
              <span>A tiny ship.</span>
              <span>An absurdly large universe.</span>
            </div>
          </>
        )}
        <div className="lines">
          {LINES.map((l, i) => (step >= i + 2 ? (
            <div key={l} className={`line ${i > 0 ? 'on' : ''}`}>{l}</div>
          ) : null))}
        </div>
      </div>
      {step >= 1 && <div className="hint">PRESS ANY KEY TO CONTINUE</div>}
    </div>
  );
}
