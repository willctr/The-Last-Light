import { useStore } from '@/state/store';
import { CATALOG_BY_ID, PROPULSION_BY_ID, PROPULSION_PROFILES } from '@/data';
import { getEngine } from '@/engine/bridge';
import { formatDateUTC, formatDistanceDual, formatDuration, formatVelocity } from '@/science/format';
import { computeTransfer } from '@/science/transfer';
import { julianDateToDate, simSecondsToJulianDate } from '@/science/units';
import { SCALE_DISCLAIMER } from '@/science/scale';
import { PropulsionTag } from './EpistemicTag';

/** SET COURSE: the transfer plan, its assumptions, and how other propulsion concepts would compare. */
export function CoursePanel() {
  const course = useStore((s) => s.course);
  const ship = useStore((s) => s.ship);
  const setPanel = useStore((s) => s.setPanel);
  if (!course) return null;
  const obj = CATALOG_BY_ID[course.targetId];
  if (!obj) return null;
  const profile = PROPULSION_BY_ID[ship.propulsionId];
  const { plan } = course;
  const engaged = course.status === 'ENGAGED';
  const complete = course.status === 'COMPLETE' || course.status === 'ABORTED';
  const peak = formatVelocity(plan.peakVelocityKms);
  const engine = getEngine();
  const depart = julianDateToDate(simSecondsToJulianDate(course.departSimTime));
  const arrive = julianDateToDate(simSecondsToJulianDate(course.arriveSimTime));

  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <h2>Course · {obj.name}</h2>
          <div className="sub">{engaged ? 'Engaged · physical transfer' : complete ? course.status : 'Transfer plan'}</div>
        </div>
        <button className="close" onClick={() => { setPanel(null); if (!engaged) engine?.abortCourse(); }} aria-label="Close">×</button>
      </div>
      <div className="panel-body">
        <div className="kv">
          <span className="k">Transfer distance</span><span className="v">{formatDistanceDual(plan.distanceKm)}<div className="hud-sub">to the target's position at arrival</div></span>
          <span className="k">Separation now</span><span className="v dim">{formatDistanceDual(course.currentSeparationKm)}</span>
          <span className="k">Light time</span><span className="v">{formatDuration(plan.lightTimeS)}</span>
          <span className="k">Drive</span><span className="v">{profile.name} <PropulsionTag status={profile.status} /></span>
          <span className="k">Profile</span><span className="v">{plan.mode.replace(/_/g, ' ')}</span>
          <span className="k">Acceleration</span><span className="v">{plan.accelerationMs2 > 0 ? `${plan.accelerationMs2.toExponential(1)} m/s² · ${(plan.accelerationMs2 / 9.80665).toExponential(1)} g` : '—'}</span>
          <span className="k">Peak velocity</span><span className="v">{peak.kms} <span className="dim">· {peak.c}</span></span>
          <span className="k">Δv required</span><span className={`v ${plan.deltaVUsedKms > ship.deltaVRemainingKms ? 'red' : ''}`}>{plan.deltaVUsedKms.toFixed(1)} km/s <span className="dim">of {ship.deltaVRemainingKms.toFixed(0)} available</span></span>
          <span className="k">Travel time</span><span className="v big amber">{formatDuration(plan.travelTimeS)}</span>
          <span className="k">Departure</span><span className="v">{formatDateUTC(depart)}</span>
          <span className="k">Arrival</span><span className="v">{formatDateUTC(arrive)}</span>
          <span className="k">Comm. delay</span><span className="v">{formatDuration(plan.lightTimeS)} one-way <span className="dim">(from destination to origin)</span></span>
        </div>
        <div className="section-title">Assumptions</div>
        {plan.assumptions.map((a, i) => <p key={i} style={{ margin: '2px 0 6px', fontSize: 11.5 }}>· {a}</p>)}
        <div className="scale-note">{SCALE_DISCLAIMER} During transit the visual flight lasts {course.durationRealS.toFixed(0)} s of real time while the mission clock advances {formatDuration(plan.travelTimeS)} (×{Math.round(course.effectiveTimeScale).toLocaleString()}).</div>
        <div className="section-title">The same trip with other concepts</div>
        <table className="tt-table"><tbody>
          <tr><td>Light</td><td>{formatDuration(plan.lightTimeS)}</td></tr>
          {PROPULSION_PROFILES.map((p) => {
            const t = computeTransfer(plan.distanceKm, p, p.deltaVBudgetKms);
            return (
              <tr key={p.id}><td>{p.name} <PropulsionTag status={p.status} /></td><td>{Number.isFinite(t.travelTimeS) ? formatDuration(t.travelTimeS) : '—'}{!p.decelerates ? ' · flyby' : ''}</td></tr>
            );
          })}
        </tbody></table>
        <p style={{ fontSize: 10.5 }}>Concepts marked THEORETICAL or SPECULATIVE have never been built; their figures are illustrative, not predictions.</p>
      </div>
      <div className="panel-foot btn-row">
        {!engaged && !complete && <button className="btn amber" onClick={() => engine?.engageCourse()}>Engage</button>}
        {!engaged && !complete && <button className="btn ghost" onClick={() => { engine?.abortCourse(); setPanel('object'); }}>Cancel</button>}
        {engaged && <button className="btn red" onClick={() => engine?.abortCourse()}>Abort course</button>}
        {complete && <button className="btn ghost" onClick={() => { engine?.abortCourse(); setPanel(null); }}>Close</button>}
      </div>
    </div>
  );
}
