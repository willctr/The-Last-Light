import { useEffect, useRef } from 'react';
import { Engine } from '@/engine/Engine';
import { getEngine } from '@/engine/bridge';
import { useStore } from '@/state/store';
import { Boot } from '@/ui/Boot';
import { Hud } from '@/ui/Hud';
import { TimeControls } from '@/ui/TimeControls';
import { Notices } from '@/ui/Notices';
import { ObjectPanel } from '@/ui/ObjectPanel';
import { LearnPanel } from '@/ui/LearnPanel';
import { CoursePanel } from '@/ui/CoursePanel';
import { DiscoveryLog } from '@/ui/DiscoveryLog';
import { ScaleLadder } from '@/ui/ScaleLadder';
import { NavDatabase } from '@/ui/NavDatabase';
import { PropulsionPanel } from '@/ui/PropulsionPanel';
import { Help } from '@/ui/Help';
import { Toolbar } from '@/ui/Toolbar';

export function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const phase = useStore((s) => s.phase);
  const panel = useStore((s) => s.panel);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const engine = new Engine(el);
    engine.start();
    return () => engine.dispose();
  }, []);

  // Deep link for demos and testing: ?course=<objectId> plans and engages a course once flight begins.
  useEffect(() => {
    if (phase !== 'flight') return;
    const id = new URLSearchParams(window.location.search).get('course');
    if (!id) return;
    const t = window.setTimeout(() => getEngine()?.approach(id), 600);
    return () => window.clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const s = useStore.getState();
      if (s.phase !== 'flight') return;
      const engine = getEngine();
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          if (s.flightMode !== 'COURSE') s.togglePaused();
          break;
        case 'BracketLeft':
          if (s.flightMode !== 'COURSE') s.stepTimeScale(-1);
          break;
        case 'BracketRight':
          if (s.flightMode !== 'COURSE') s.stepTimeScale(1);
          break;
        case 'KeyL': s.togglePanel('log'); break;
        case 'KeyM': s.togglePanel('scale'); break;
        case 'KeyN': s.togglePanel('navdb'); break;
        case 'KeyP': s.togglePanel('propulsion'); break;
        case 'KeyH': case 'Slash': s.togglePanel('help'); break;
        case 'KeyO': s.toggleOrbits(); break;
        case 'KeyK': s.toggleLabels(); engine?.setLabelsEnabled(!s.showLabels); break;
        case 'KeyU': s.toggleMuted(); engine?.setMuted(!s.muted); break;
        case 'KeyT': if (s.selectedId) engine?.planCourse(s.selectedId); break;
        case 'Enter': if (s.course?.status === 'PLANNED') engine?.engageCourse(); break;
        case 'KeyV': if (s.selectedId) engine?.approach(s.selectedId); break;
        case 'KeyX': engine?.abortCourse(); break;
        case 'KeyC': if (s.selectedId) engine?.scan(s.selectedId); break;
        case 'KeyE': if (s.selectedId) s.setPanel(s.panel === 'learn' ? 'object' : 'learn'); break;
        case 'Escape':
          if (s.panel && s.panel !== 'object') s.setPanel(s.selectedId ? 'object' : null);
          else engine?.select(null);
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="app">
      <div className="space-container" ref={containerRef} />
      {phase === 'boot' && <Boot />}
      {phase === 'flight' && (
        <div className="ui">
          <Hud />
          <Notices />
          <TimeControls />
          <Toolbar />
          {panel === 'object' && <ObjectPanel />}
          {panel === 'learn' && <LearnPanel />}
          {panel === 'course' && <CoursePanel />}
          {panel === 'log' && <DiscoveryLog />}
          {panel === 'scale' && <ScaleLadder />}
          {panel === 'navdb' && <NavDatabase />}
          {panel === 'propulsion' && <PropulsionPanel />}
          {panel === 'help' && <Help />}
        </div>
      )}
    </div>
  );
}
