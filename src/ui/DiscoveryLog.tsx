import { useStore } from '@/state/store';
import { CATALOG_BY_ID, isBody } from '@/data';
import { getEngine } from '@/engine/bridge';
import { FactorTag } from './EpistemicTag';

const BIO_LABEL: Record<string, string> = { HOME: 'HOME', HIGH: 'HIGH', MODERATE: 'MODERATE', LOW: 'LOW', NONE: 'NONE' };

/** The player's growing cosmic field guide. */
export function DiscoveryLog() {
  const order = useStore((s) => s.discoveryOrder);
  const discoveries = useStore((s) => s.discoveries);
  const setPanel = useStore((s) => s.setPanel);
  const selectedId = useStore((s) => s.selectedId);
  const total = Object.keys(CATALOG_BY_ID).length;

  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <h2>Discovery log</h2>
          <div className="sub">{order.length} of {total} catalogued objects identified</div>
        </div>
        <button className="close" onClick={() => setPanel(null)} aria-label="Close">×</button>
      </div>
      <div className="panel-body">
        {order.length === 0 && <p>Nothing identified yet. Approach an object to identify it; scan it to read its properties.</p>}
        {[...order].reverse().map((id) => {
          const e = discoveries[id];
          const o = CATALOG_BY_ID[id];
          if (!o) return null;
          const key = isBody(o) && o.habitability ? o.habitability.slice(0, 3) : [];
          return (
            <div key={id} className={`navrow ${selectedId === id ? 'sel' : ''}`} onClick={() => { getEngine()?.select(id); setPanel('object'); }}>
              <div>
                <div className="n">#{String(e.index).padStart(3, '0')} · {o.name}</div>
                <div className="c">{o.classLabel} · {e.scanned ? 'scanned' : 'identified'}</div>
                {e.scanned && key.length > 0 && (
                  <div className="btn-row" style={{ marginTop: 6 }}>
                    {key.map((h) => (
                      <span key={h.factor} className="k" style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>{h.factor.replace(/_/g, ' ')} <FactorTag value={h.value} /></span>
                    ))}
                  </div>
                )}
              </div>
              <div className={`d bio-${o.biologicalInterest.toLowerCase()}`}>BIO<small>{BIO_LABEL[o.biologicalInterest]}</small></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
