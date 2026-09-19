import { useStore } from '@/state/store';
import { CATALOG_BY_ID, isBody, isDistant, isRegion } from '@/data';
import { HABITABILITY_FACTOR_ORDER, type CelestialBody, type FactorValue } from '@/data/types';
import { getEngine } from '@/engine/bridge';
import { formatDistance, formatMass, formatRadius, formatTemperature } from '@/science/format';
import { EpistemicTag, FactorTag } from './EpistemicTag';

const BIO_LABEL: Record<string, string> = { HOME: 'HOME · INHABITED', HIGH: 'HIGH', MODERATE: 'MODERATE', LOW: 'LOW', NONE: 'NONE' };

/** Identification card for the selected object with SCAN / APPROACH / LEARN / SET COURSE. */
export function ObjectPanel() {
  const selectedId = useStore((s) => s.selectedId);
  const discoveries = useStore((s) => s.discoveries);
  const scan = useStore((s) => s.scan);
  const ship = useStore((s) => s.ship);
  const flightMode = useStore((s) => s.flightMode);
  const setPanel = useStore((s) => s.setPanel);
  const select = useStore((s) => s.select);
  if (!selectedId) return null;
  const obj = CATALOG_BY_ID[selectedId];
  if (!obj) return null;
  const entry = discoveries[selectedId];
  const scanning = scan?.objectId === selectedId;
  const engine = getEngine();
  const inCourse = flightMode === 'COURSE';
  const distant = isDistant(obj);

  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <h2>{obj.name}</h2>
          <div className="sub">{obj.classLabel}</div>
        </div>
        <button className="close" onClick={() => { select(null); getEngine()?.select(null); }} aria-label="Close">×</button>
      </div>
      <div className="panel-body">
        <div className="row">
          <span className="k">{entry ? `Discovery #${String(entry.index).padStart(3, '0')}` : 'Not yet identified'}</span>
          <span className={`k bio-${obj.biologicalInterest.toLowerCase()}`}>Bio interest · {BIO_LABEL[obj.biologicalInterest]}</span>
        </div>
        <div className="hr" />
        <div className="kv">
          <span className="k">Range</span>
          <span className="v">{formatDistance(ship.distanceToSelectedKm ?? NaN)}</span>
          {isBody(obj) && (
            <>
              <span className="k">Radius</span>
              <span className="v">{formatRadius(obj.radiusKm)}</span>
              {entry?.scanned && (
                <>
                  <span className="k">Mass</span>
                  <span className="v">{obj.massKg ? formatMass(obj.massKg) : 'UNKNOWN'}</span>
                  <span className="k">Temperature</span>
                  <span className="v">{obj.meanTemperatureK ? formatTemperature(obj.meanTemperatureK) : 'UNKNOWN'}</span>
                  {obj.atmosphere && (
                    <>
                      <span className="k">Atmosphere</span>
                      <span className="v sans" style={{ fontSize: 11.5 }}>{obj.atmosphere}</span>
                    </>
                  )}
                  {obj.composition && (
                    <>
                      <span className="k">Composition</span>
                      <span className="v sans" style={{ fontSize: 11.5 }}>{obj.composition}</span>
                    </>
                  )}
                </>
              )}
            </>
          )}
          {isRegion(obj) && (
            <>
              <span className="k">Extent</span>
              <span className="v">{obj.innerAU.toLocaleString()} – {obj.outerAU.toLocaleString()} AU</span>
            </>
          )}
          {distant && (
            <>
              <span className="k">Distance</span>
              <span className="v">{formatDistance(obj.distanceKm)}</span>
              {obj.spectralType && (<><span className="k">Spectral type</span><span className="v">{obj.spectralType}</span></>)}
            </>
          )}
        </div>
        {scanning && (
          <div>
            <div className="section-title">Scanning · {Math.round((scan?.progress ?? 0) * 100)}%</div>
            <div className="scan-bar"><i style={{ width: `${(scan?.progress ?? 0) * 100}%` }} /></div>
          </div>
        )}
        <p className="lead">{obj.summary}</p>
        {entry?.scanned && obj.habitability && <HabitabilityMatrix body={obj as CelestialBody} compact />}
        {entry?.scanned && obj.facts.slice(0, 2).map((f, i) => (
          <div className="fact" key={i}><EpistemicTag status={f.status} /><span className="t">{f.text}</span></div>
        ))}
        {!entry?.scanned && !distant && <p style={{ fontSize: 11 }}>Scan to read measured properties and the habitability assessment.</p>}
      </div>
      <div className="panel-foot btn-row">
        {!distant && <button className="btn" disabled={!!scan} onClick={() => engine?.scan(obj.id)}>Scan</button>}
        {!distant && <button className="btn" disabled={inCourse} onClick={() => engine?.approach(obj.id)}>Approach</button>}
        <button className="btn" onClick={() => setPanel('learn')}>Learn</button>
        {!distant && <button className="btn amber" disabled={inCourse} onClick={() => engine?.planCourse(obj.id)}>Set course</button>}
        {distant && <button className="btn amber" onClick={() => setPanel('navdb')}>Travel times</button>}
      </div>
    </div>
  );
}

export function HabitabilityMatrix({ body, compact = false }: { body: CelestialBody; compact?: boolean }) {
  if (!body.habitability) return null;
  const byKey = new Map(body.habitability.map((h) => [h.factor, h]));
  const keys = HABITABILITY_FACTOR_ORDER.filter((k) => byKey.has(k));
  return (
    <div>
      <div className="section-title">Habitability factors</div>
      <div className="hab-grid">
        {keys.map((k) => {
          const h = byKey.get(k)!;
          return (
            <FactorRow key={k} label={k.replace(/_/g, ' ')} value={h.value} note={compact ? '' : h.note} />
          );
        })}
      </div>
      {!compact && <p style={{ fontSize: 11 }}>Factors marked UNKNOWN reflect the limits of observation, not an absence of interest. No biosignature has been detected anywhere beyond Earth.</p>}
    </div>
  );
}

function FactorRow({ label, value, note }: { label: string; value: FactorValue; note: string }) {
  return (
    <>
      <span className="k">{label}</span>
      <FactorTag value={value} />
      {note && <span className="hab-note">{note}</span>}
    </>
  );
}
