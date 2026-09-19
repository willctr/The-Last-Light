import { useStore } from '@/state/store';
import { CATALOG_BY_ID, PROPULSION_BY_ID } from '@/data';
import { formatAccelerationG, formatDistance, formatDuration, formatMissionClock, formatPercent, formatVelocity } from '@/science/format';
import { AU_KM } from '@/science/units';

const ZONE_LABEL: Record<string, string> = {
  INNER_SYSTEM: 'INNER SOLAR SYSTEM',
  PLANETARY_REGION: 'PLANETARY REGION',
  KUIPER_BELT: 'KUIPER BELT',
  OUTER_SOLAR_SYSTEM: 'OUTER SOLAR SYSTEM',
  HELIOPAUSE_APPROACH: 'HELIOPAUSE APPROACH',
  INTERSTELLAR_SPACE: 'INTERSTELLAR SPACE',
};

/** Persistent instrument panel: ship status (left) and navigation status (right). */
export function Hud() {
  const ship = useStore((s) => s.ship);
  const simTime = useStore((s) => s.simTime);
  const missionStart = useStore((s) => s.missionStartSimTime);
  const flightMode = useStore((s) => s.flightMode);
  const zone = useStore((s) => s.zone);
  const selectedId = useStore((s) => s.selectedId);
  const course = useStore((s) => s.course);

  const vel = formatVelocity(ship.velocityKms);
  const propulsion = PROPULSION_BY_ID[ship.propulsionId];
  const selected = selectedId ? CATALOG_BY_ID[selectedId] : null;
  const target = course && course.status === 'ENGAGED' ? CATALOG_BY_ID[course.targetId] : null;
  const fuelClass = ship.fuelFraction < 0.15 ? 'red' : ship.fuelFraction < 0.4 ? 'amber' : '';
  const engaged = course?.status === 'ENGAGED';
  const remainingSim = engaged && course ? Math.max(0, course.arriveSimTime - simTime) : null;

  return (
    <>
      <div className="hud-block hud-ship">
        <div className="hud-title">AURORA-01</div>
        <div className="hud-grid">
          <span className="k">Velocity</span>
          <span className="v">
            {ship.velocityFrame.startsWith('VISUAL') ? <span className="dim">—</span> : <>{vel.kms} <span className="dim">· {vel.c}</span></>}
            <div className="hud-sub">{ship.velocityFrame}</div>
          </span>
          <span className="k">Distance</span>
          <span className="v">{formatDistance(ship.helioDistanceKm)}<div className="hud-sub">from Sun · {(ship.helioDistanceKm / AU_KM).toFixed(3)} AU</div></span>
          <span className="k optional">Acceleration</span>
          <span className="v optional">{formatAccelerationG(ship.accelerationMs2)}</span>
          <span className="k">Δv / Fuel</span>
          <span className={`v ${fuelClass}`}>
            {formatPercent(ship.fuelFraction)} <span className="dim">· {ship.deltaVRemainingKms.toFixed(0)} km/s</span>
            <div className={`bar ${fuelClass}`}><i style={{ width: `${ship.fuelFraction * 100}%` }} /></div>
          </span>
          <span className="k optional">Power</span>
          <span className="v optional">{formatPercent(ship.powerFraction)}</span>
          <span className="k optional">Propulsion</span>
          <span className="v optional">{propulsion.name}<div className="hud-sub">{propulsion.status}</div></span>
          <span className="k">Mission time</span>
          <span className="v big">{formatMissionClock(simTime - missionStart)}</span>
          <span className="k optional">Flight</span>
          <span className={`v optional ${flightMode === 'COURSE' ? 'amber' : flightMode === 'MANUAL' ? 'cyan' : ''}`}>
            {flightMode === 'COURSE' ? 'COURSE · PHYSICAL TRANSFER' : flightMode === 'MANUAL' ? 'MANUAL · VISUAL NAV' : 'STATION KEEPING'}
          </span>
        </div>
        <div className="zone-line">{ZONE_LABEL[zone]}</div>
      </div>

      <div className="hud-block hud-nav">
        <div className="hud-title">NAVIGATION</div>
        <div className="hud-grid">
          <span className="k">Target</span>
          <span className={`v ${target ? 'amber' : ''}`}>{target ? target.name.toUpperCase() : selected ? selected.name.toUpperCase() : '—'}<div className="hud-sub">{target ? 'course engaged' : selected ? 'selected' : 'none'}</div></span>
          {(target || selected) && (
            <>
              <span className="k">Range</span>
              <span className="v">{formatDistance((target ? ship.distanceToTargetKm : ship.distanceToSelectedKm) ?? NaN)}<div className="hud-sub">real distance</div></span>
            </>
          )}
          {engaged && course && remainingSim !== null && (
            <>
              <span className="k">ETA</span>
              <span className="v amber">{formatDuration(remainingSim)}<div className="hud-sub">mission time · {Math.max(0, Math.round(course.durationRealS * (1 - course.progress)))} s real</div></span>
              <span className="k">Progress</span>
              <span className="v"><div className="bar amber"><i style={{ width: `${course.progress * 100}%` }} /></div></span>
            </>
          )}
          <span className="k optional">Light to Earth</span>
          <span className="v optional">{formatDuration(ship.lightTimeToEarthS)}<div className="hud-sub">one-way signal delay</div></span>
        </div>
      </div>
    </>
  );
}
