import { useStore } from '@/state/store';
import { CATALOG_BY_ID, SOURCE_BY_ID, isBody } from '@/data';
import { EpistemicLegend, EpistemicTag } from './EpistemicTag';
import { HabitabilityMatrix } from './ObjectPanel';
import { formatDistance, formatMass, formatRadius, formatTemperature } from '@/science/format';
import { orbitPeriodDays } from '@/science/kepler';

/** Full science dossier: facts with epistemic status, habitability matrix, uncertainty notes and sources. */
export function LearnPanel() {
  const selectedId = useStore((s) => s.selectedId);
  const setPanel = useStore((s) => s.setPanel);
  if (!selectedId) return null;
  const obj = CATALOG_BY_ID[selectedId];
  if (!obj) return null;
  const sources = obj.sourceIds.map((id) => SOURCE_BY_ID[id]).filter(Boolean);
  const factSources = new Set(obj.facts.flatMap((f) => f.sourceIds ?? []));
  const allSources = [...new Map([...sources, ...[...factSources].map((id) => SOURCE_BY_ID[id]).filter(Boolean)].map((s) => [s.id, s])).values()];

  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <h2>{obj.name}</h2>
          <div className="sub">Science dossier · {obj.classLabel}</div>
        </div>
        <button className="close" onClick={() => setPanel('object')} aria-label="Back">←</button>
      </div>
      <div className="panel-body">
        <EpistemicLegend />
        <p className="lead" style={{ marginTop: 12 }}>{obj.summary}</p>
        {isBody(obj) && (
          <>
            <div className="section-title">Measured properties</div>
            <div className="kv">
              <span className="k">Radius</span><span className="v">{formatRadius(obj.radiusKm)}</span>
              <span className="k">Mass</span><span className="v">{obj.massKg ? formatMass(obj.massKg) : 'UNKNOWN'}</span>
              <span className="k">Mean temp.</span><span className="v">{obj.meanTemperatureK ? formatTemperature(obj.meanTemperatureK) : 'UNKNOWN'}</span>
              {obj.rotationPeriodDays !== undefined && (<><span className="k">Rotation</span><span className="v">{Math.abs(obj.rotationPeriodDays) < 2 ? `${(Math.abs(obj.rotationPeriodDays) * 24).toFixed(2)} h` : `${Math.abs(obj.rotationPeriodDays).toFixed(2)} d`}{obj.rotationPeriodDays < 0 ? ' · retrograde' : ''}</span></>)}
              {obj.axialTiltDeg !== undefined && (<><span className="k">Axial tilt</span><span className="v">{obj.axialTiltDeg.toFixed(2)}°</span></>)}
              {obj.orbit && (<><span className="k">Orbital period</span><span className="v">{describePeriod(orbitPeriodDays(obj.orbit.elements))}</span></>)}
              {obj.orbit && obj.orbit.elements.kind === 'kepler' && (<><span className="k">Semi-major axis</span><span className="v">{obj.orbit.unit === 'km' ? formatDistance(obj.orbit.elements.a) : `${obj.orbit.elements.a.toFixed(3)} AU`}</span></>)}
              {obj.orbit && obj.orbit.elements.kind === 'standish' && (<><span className="k">Semi-major axis</span><span className="v">{obj.orbit.elements.a.toFixed(4)} AU</span></>)}
              {obj.atmosphere && (<><span className="k">Atmosphere</span><span className="v sans" style={{ fontSize: 11.5 }}>{obj.atmosphere}</span></>)}
              {obj.composition && (<><span className="k">Composition</span><span className="v sans" style={{ fontSize: 11.5 }}>{obj.composition}</span></>)}
            </div>
          </>
        )}
        <div className="section-title">What we know — and how well</div>
        {obj.facts.map((f, i) => (
          <div className="fact" key={i}><EpistemicTag status={f.status} /><span className="t">{f.text}</span></div>
        ))}
        {isBody(obj) && obj.habitability && <HabitabilityMatrix body={obj} />}
        {obj.uncertainty && (
          <>
            <div className="section-title">Uncertainty & simplifications</div>
            <p>{obj.uncertainty}</p>
          </>
        )}
        {isBody(obj) && obj.orbit?.note && <p style={{ fontSize: 11 }}>Orbit model: {obj.orbit.note}</p>}
        <div className="section-title">Sources</div>
        {allSources.map((s) => (
          <div className="source" key={s.id}>
            <b>{s.title}</b> — {s.publisher}{s.year ? `, ${s.year}` : ''}{s.url ? <> · <a href={s.url} target="_blank" rel="noreferrer">link</a></> : null}
            {s.note ? <div>{s.note}</div> : null}
          </div>
        ))}
        <p style={{ fontSize: 10.5 }}>Summaries are paraphrased; no source text is reproduced. Visual appearance of every body is procedural and not a photographic reconstruction.</p>
      </div>
    </div>
  );
}

function describePeriod(days: number): string {
  if (days < 2) return `${(days * 24).toFixed(2)} h`;
  if (days < 800) return `${days.toFixed(2)} days`;
  return `${(days / 365.25).toFixed(1)} years`;
}
