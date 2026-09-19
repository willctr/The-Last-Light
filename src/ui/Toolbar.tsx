import { useStore } from '@/state/store';
import { getEngine } from '@/engine/bridge';

export function Toolbar() {
  const panel = useStore((s) => s.panel);
  const toggle = useStore((s) => s.togglePanel);
  const showOrbits = useStore((s) => s.showOrbits);
  const showLabels = useStore((s) => s.showLabels);
  const muted = useStore((s) => s.muted);
  const toggleOrbits = useStore((s) => s.toggleOrbits);
  const toggleLabels = useStore((s) => s.toggleLabels);
  const toggleMuted = useStore((s) => s.toggleMuted);
  const count = useStore((s) => s.discoveryOrder.length);
  return (
    <div className="toolbar">
      <button className={`btn ${panel === 'log' ? 'active' : ''}`} onClick={() => toggle('log')}><u>L</u>og · {count}</button>
      <button className={`btn ${panel === 'scale' ? 'active' : ''}`} onClick={() => toggle('scale')}>Scale <u>M</u></button>
      <button className={`btn ${panel === 'navdb' ? 'active' : ''}`} onClick={() => toggle('navdb')}><u>N</u>av</button>
      <button className={`btn ${panel === 'propulsion' ? 'active' : ''}`} onClick={() => toggle('propulsion')}><u>P</u>ropulsion</button>
      <button className={`btn ghost ${showOrbits ? '' : ''}`} onClick={toggleOrbits}><u>O</u>rbits {showOrbits ? 'on' : 'off'}</button>
      <button className="btn ghost" onClick={() => { toggleLabels(); getEngine()?.setLabelsEnabled(!showLabels); }}>Labels(<u>K</u>) {showLabels ? 'on' : 'off'}</button>
      <button className="btn ghost" onClick={() => { toggleMuted(); getEngine()?.setMuted(!muted); }}>{muted ? 'Sound off' : 'Sound on'} (<u>U</u>)</button>
      <button className={`btn ghost ${panel === 'help' ? 'active' : ''}`} onClick={() => toggle('help')}><u>H</u>elp</button>
    </div>
  );
}
