import { useMemo } from 'react';
import { useStore } from '@/state/store';
import { BODIES, DISTANT_DESTINATIONS, PROPULSION_BY_ID, PROPULSION_PROFILES, REGIONS } from '@/data';
import { getEngine } from '@/engine/bridge';
import { formatDistance, formatDistanceDual, formatDuration } from '@/science/format';
import { computeTransfer } from '@/science/transfer';
import { PropulsionTag } from './EpistemicTag';

/** Navigation database: every destination with real distance; distant ones with the travel-time comparison. */
export function NavDatabase() {
  const setPanel = useStore((s) => s.setPanel);
  const selectedId = useStore((s) => s.selectedId);
  const ship = useStore((s) => s.ship);
  const groups = useMemo(() => {
    const planets = BODIES.filter((b) => b.type === 'Planet' || b.type === 'Star');
    const moons = BODIES.filter((b) => b.type === 'Moon');
    const dwarfs = BODIES.filter((b) => b.type === 'DwarfPlanet');
    return [
      ['Sun & planets', planets],
      ['Moons', moons],
      ['Dwarf planets', dwarfs],
    ] as const;
  }, []);
  const selectedDistant = DISTANT_DESTINATIONS.find((d) => d.id === selectedId);
  const profile = PROPULSION_BY_ID[ship.propulsionId];

  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <h2>Nav database</h2>
          <div className="sub">Select a destination · T to set course</div>
        </div>
        <button className="close" onClick={() => setPanel(null)} aria-label="Close">×</button>
      </div>
      <div className="panel-body">
        {groups.map(([title, list]) => (
          <div key={title}>
            <div className="section-title">{title}</div>
            <div className="navlist">
              {list.map((b) => (
                <div key={b.id} className={`navrow ${selectedId === b.id ? 'sel' : ''}`} onClick={() => getEngine()?.select(b.id)}>
                  <div><div className="n">{b.name}</div><div className="c">{b.classLabel}</div></div>
                  <div className="d">{b.parentId && b.parentId !== 'sun' ? `moon of ${b.parentId}` : ''}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
        <div className="section-title">Regions</div>
        <div className="navlist">
          {REGIONS.map((r) => (
            <div key={r.id} className={`navrow ${selectedId === r.id ? 'sel' : ''}`} onClick={() => getEngine()?.select(r.id)}>
              <div><div className="n">{r.name}</div><div className="c">{r.classLabel}</div></div>
              <div className="d">{r.innerAU.toLocaleString()}–{r.outerAU.toLocaleString()} AU</div>
            </div>
          ))}
        </div>
        <div className="section-title">Beyond the Solar System · not navigable in this build</div>
        <div className="navlist">
          {DISTANT_DESTINATIONS.map((d) => (
            <div key={d.id} className={`navrow ${selectedId === d.id ? 'sel' : ''}`} onClick={() => getEngine()?.select(d.id)}>
              <div><div className="n">{d.name}</div><div className="c">{d.classLabel}</div></div>
              <div className="d">{formatDistance(d.distanceKm)}<small>light: {formatDuration(d.distanceKm / 299792.458)}</small></div>
            </div>
          ))}
        </div>
        {selectedDistant && (
          <>
            <div className="section-title">Earth → {selectedDistant.name}</div>
            <div className="kv">
              <span className="k">Real distance</span><span className="v">{formatDistanceDual(selectedDistant.distanceKm)}</span>
              <span className="k">Visual distance</span><span className="v dim">compressed for navigation · not rendered</span>
            </div>
            <table className="tt-table"><tbody>
              <tr><td>Light</td><td>{formatDuration(selectedDistant.distanceKm / 299792.458)}</td></tr>
              <tr><td>AURORA-01 ({profile.name})</td><td>{formatDuration(computeTransfer(selectedDistant.distanceKm, profile, profile.deltaVBudgetKms).travelTimeS)}</td></tr>
              {PROPULSION_PROFILES.filter((p) => p.id !== profile.id).map((p) => {
                const t = computeTransfer(selectedDistant.distanceKm, p, p.deltaVBudgetKms);
                return <tr key={p.id}><td>{p.name} <PropulsionTag status={p.status} /></td><td>{Number.isFinite(t.travelTimeS) ? formatDuration(t.travelTimeS) : '—'}{!p.decelerates ? ' · flyby' : ''}</td></tr>;
              })}
            </tbody></table>
            <p style={{ fontSize: 10.5 }}>No propulsion humanity has built can reach another star within a human lifetime. Concepts that could are proposals, not hardware.</p>
          </>
        )}
      </div>
    </div>
  );
}
