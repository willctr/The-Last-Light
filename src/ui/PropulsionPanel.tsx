import { useStore } from '@/state/store';
import { PROPULSION_PROFILES, SOURCE_BY_ID } from '@/data';
import { formatDuration } from '@/science/format';
import { computeTransfer } from '@/science/transfer';
import { LIGHT_YEAR_KM } from '@/science/units';
import { PropulsionTag } from './EpistemicTag';

const PROXIMA_KM = 4.2465 * LIGHT_YEAR_KM;
const MARS_KM = 78e6;

/** Propulsion concept catalogue with status, performance, energy, limitations and representative travel times. */
export function PropulsionPanel() {
  const setPanel = useStore((s) => s.setPanel);
  const current = useStore((s) => s.ship.propulsionId);
  const setTelemetry = useStore((s) => s.setTelemetry);
  const flightMode = useStore((s) => s.flightMode);

  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <h2>Propulsion</h2>
          <div className="sub">From flown hardware to unbuilt ideas</div>
        </div>
        <button className="close" onClick={() => setPanel(null)} aria-label="Close">×</button>
      </div>
      <div className="panel-body">
        <div className="btn-row" style={{ gap: 8 }}>
          <span className="tag demonstrated">Demonstrated</span>
          <span className="tag proposed">Proposed</span>
          <span className="tag theoretical">Theoretical</span>
          <span className="tag speculative">Speculative</span>
        </div>
        {PROPULSION_PROFILES.map((p) => {
          const mars = computeTransfer(MARS_KM, p, p.deltaVBudgetKms);
          const prox = computeTransfer(PROXIMA_KM, p, p.deltaVBudgetKms);
          const active = p.id === current;
          return (
            <div key={p.id} style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--cyan-line)' }}>
              <div className="row">
                <span className="v" style={{ letterSpacing: '0.18em' }}>{p.name}</span>
                <PropulsionTag status={p.status} />
              </div>
              <p>{p.summary}</p>
              <div className="kv">
                <span className="k">Performance</span><span className="v sans" style={{ fontSize: 11.5 }}>{p.performance}</span>
                <span className="k">Energy</span><span className="v sans" style={{ fontSize: 11.5 }}>{p.energy}</span>
                <span className="k">Limitations</span><span className="v sans" style={{ fontSize: 11.5 }}>{p.limitations}</span>
                <span className="k">Examples</span><span className="v sans" style={{ fontSize: 11.5 }}>{p.examples}</span>
                <span className="k">Earth → Mars</span><span className="v">{formatDuration(mars.travelTimeS)}{!p.decelerates ? ' · flyby' : ''}</span>
                <span className="k">→ Proxima</span><span className="v">{formatDuration(prox.travelTimeS)}{!p.decelerates ? ' · flyby' : ''}</span>
              </div>
              <div style={{ marginTop: 8 }} className="btn-row">
                <button className={`btn ${active ? 'active' : ''}`} disabled={flightMode === 'COURSE'} onClick={() => setTelemetry({ propulsionId: p.id, deltaVRemainingKms: p.deltaVBudgetKms, fuelFraction: 1 })}>
                  {active ? 'Installed' : 'Install for simulation'}
                </button>
              </div>
              <div style={{ marginTop: 6 }}>
                {p.sourceIds.map((id) => SOURCE_BY_ID[id]).filter(Boolean).map((s) => <div className="source" key={s.id}><b>{s.title}</b> — {s.publisher}{s.year ? `, ${s.year}` : ''}</div>)}
              </div>
            </div>
          );
        })}
        <p style={{ fontSize: 10.5, marginTop: 14 }}>Installing a concept changes only the simulation's travel-time model. It does not make the concept real. Mars figure assumes a 78 million km straight-line transfer; Proxima 4.2465 ly.</p>
      </div>
    </div>
  );
}
