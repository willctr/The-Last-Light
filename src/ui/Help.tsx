import { useStore } from '@/state/store';
import { SCALE_DISCLAIMER } from '@/science/scale';

export function Help() {
  const setPanel = useStore((s) => s.setPanel);
  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <h2>Controls</h2>
          <div className="sub">AURORA-01 flight reference</div>
        </div>
        <button className="close" onClick={() => setPanel(null)} aria-label="Close">×</button>
      </div>
      <div className="panel-body">
        <div className="section-title">Camera & flight</div>
        <div className="keys">
          <kbd>drag</kbd><span>Look around the ship</span>
          <kbd>wheel / pinch</kbd><span>Zoom out to the whole system, or in to the hull</span>
          <kbd>W S</kbd><span>Thrust forward / back (visual navigation)</span>
          <kbd>A D · R F</kbd><span>Strafe · rise / descend</span>
          <kbd>shift</kbd><span>Boost</span>
          <kbd>click</kbd><span>Select an object (or click its label)</span>
        </div>
        <div className="section-title">Navigation & science</div>
        <div className="keys">
          <kbd>T</kbd><span>Set course to the selected object (physical transfer plan)</span>
          <kbd>enter</kbd><span>Engage a planned course</span>
          <kbd>V</kbd><span>Approach: plan and engage in one step</span>
          <kbd>X</kbd><span>Abort course</span>
          <kbd>C</kbd><span>Scan the selected object</span>
          <kbd>E</kbd><span>Learn: open the science dossier</span>
          <kbd>esc</kbd><span>Close panel / clear selection</span>
        </div>
        <div className="section-title">Time</div>
        <div className="keys">
          <kbd>space</kbd><span>Pause simulation time</span>
          <kbd>[ ]</kbd><span>Slower / faster (×1 to ×1,000,000)</span>
        </div>
        <div className="section-title">Panels</div>
        <div className="keys">
          <kbd>L</kbd><span>Discovery log</span>
          <kbd>M</kbd><span>Cosmic scale</span>
          <kbd>N</kbd><span>Navigation database</span>
          <kbd>P</kbd><span>Propulsion concepts</span>
          <kbd>O · K</kbd><span>Toggle orbits · labels</span>
          <kbd>U</kbd><span>Mute audio</span>
          <kbd>H</kbd><span>This help</span>
        </div>
        <div className="section-title">About the map</div>
        <div className="scale-note">{SCALE_DISCLAIMER}</div>
        <p>Manual flight moves the ship through the visual representation without modelling transit time — use it to look around. SET COURSE computes a real transfer with the installed drive: distance, Δv, travel time and arrival date are physical, and the mission clock advances accordingly while the visual flight plays out.</p>
        <p>Planet positions come from JPL mean orbital elements (1800–2050). Moon orbital phases are approximate. Surfaces are procedural, not photographic.</p>
      </div>
    </div>
  );
}
