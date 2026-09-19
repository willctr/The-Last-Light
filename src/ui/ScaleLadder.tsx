import { useStore } from '@/state/store';
import { AU_KM, LIGHT_YEAR_KM } from '@/science/units';

interface Rung {
  name: string;
  size: string;
  light: string;
  note: string;
}

const RUNGS: Rung[] = [
  { name: 'Human', size: '~2 m', light: '7 ns', note: 'The scale from which every measurement below is extrapolated.' },
  { name: 'Earth', size: '12,742 km', light: '43 ms', note: 'The only inhabited world known.' },
  { name: 'Solar System', size: '~240 AU to the heliopause', light: '~17 h', note: 'Eight planets, hundreds of moons, millions of small bodies. Voyager 1 needed 35 years to leave.' },
  { name: 'Nearest star', size: '4.25 ly', light: '4.25 yr', note: 'Proxima Centauri. AURORA-01 would need over ten thousand years.' },
  { name: 'Milky Way', size: '~100,000 ly', light: '100,000 yr', note: 'Hundreds of billions of stars; we have mapped a small fraction.' },
  { name: 'Local Group', size: '~10 million ly', light: '10 Myr', note: 'The Milky Way, Andromeda, Triangulum and ~80 dwarf galaxies.' },
  { name: 'Galaxy clusters', size: '~100 million ly', light: '100 Myr', note: 'Virgo Supercluster and neighbours, bound by dark matter.' },
  { name: 'Cosmic web', size: '~1 billion ly', light: '1 Gyr', note: 'Filaments and voids — the largest structures that exist.' },
  { name: 'Observable universe', size: '93 billion ly', light: '13.8 Gyr', note: 'The region from which light has had time to reach us. Not necessarily everything there is.' },
];

/** Reusable cosmic-scale ladder with the current location highlighted. */
export function ScaleLadder() {
  const setPanel = useStore((s) => s.setPanel);
  const helio = useStore((s) => s.ship.helioDistanceKm);
  const frame = useStore((s) => s.ship.frameBodyId);
  const here = frame === 'earth' && helio < 1.2 * AU_KM ? 1 : helio < 300 * AU_KM ? 2 : helio < 10 * LIGHT_YEAR_KM ? 3 : 4;

  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <h2>Cosmic scale</h2>
          <div className="sub">Where AURORA-01 is on the map</div>
        </div>
        <button className="close" onClick={() => setPanel(null)} aria-label="Close">×</button>
      </div>
      <div className="panel-body">
        <div className="ladder">
          {RUNGS.map((r, i) => (
            <div key={r.name} className={`rung ${i === here ? 'here' : ''}`}>
              <span className="idx">{String(i + 1).padStart(2, '0')}</span>
              <span className="n">{r.name}</span>
              <span className="d">{r.size}<br /><span style={{ opacity: 0.7 }}>light: {r.light}</span></span>
              <span className="sub">{r.note}</span>
            </div>
          ))}
        </div>
        <div className="scale-note">Each rung is roughly ten thousand times larger than the one before. The visual environment compresses distance so the map stays navigable; the readouts do not.</div>
      </div>
    </div>
  );
}
