import { useStore } from '@/state/store';
import { formatDateUTC, formatGrouped } from '@/science/format';
import { julianDateToDate, simSecondsToJulianDate } from '@/science/units';

export function TimeControls() {
  const timeScale = useStore((s) => s.timeScale);
  const paused = useStore((s) => s.paused);
  const effective = useStore((s) => s.effectiveTimeScale);
  const flightMode = useStore((s) => s.flightMode);
  const simTime = useStore((s) => s.simTime);
  const step = useStore((s) => s.stepTimeScale);
  const toggle = useStore((s) => s.togglePaused);
  const auto = flightMode === 'COURSE';
  const shown = auto ? effective : paused ? 0 : timeScale;
  const cls = auto ? 'auto' : shown > 1 ? 'warp' : '';
  const date = julianDateToDate(simSecondsToJulianDate(simTime));

  return (
    <>
      <div className="date-line">SIMULATION DATE · {formatDateUTC(date)}</div>
      <div className="time-controls" role="group" aria-label="Simulation time">
        <button className="btn time-btn" onClick={() => step(-1)} disabled={auto} title="Slower ( [ )">−</button>
        <div className={`time-scale ${cls}`}>
          <span className="v">{auto ? `AUTO ×${compact(shown)}` : paused ? 'PAUSED' : `TIME ×${formatGrouped(shown)}`}</span>
          <span className="k">{auto ? 'transit · sim time accelerated' : shown > 1 ? 'simulation time accelerated' : 'real time'}</span>
        </div>
        <button className="btn time-btn" onClick={() => step(1)} disabled={auto} title="Faster ( ] )">+</button>
        <button className={`btn time-btn ${paused ? 'active' : ''}`} onClick={toggle} disabled={auto} title="Pause (Space)">{paused ? '▶' : '❚❚'}</button>
      </div>
    </>
  );
}

function compact(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}k`;
  return n.toFixed(0);
}
