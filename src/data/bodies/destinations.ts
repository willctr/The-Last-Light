import type { DistantDestination } from '../types';
import { LIGHT_YEAR_KM } from '@/science/units';

/**
 * Distant destinations listed in the navigation database for scale intuition. They are not
 * navigable in this build — the interstellar tier is a later milestone — but their real
 * distances and travel times are shown so the player keeps meeting the size of the map.
 * Directions are heliocentric J2000 ecliptic unit vectors (approximate).
 */
export const DISTANT_DESTINATIONS: DistantDestination[] = [
  {
    id: 'proxima-centauri',
    name: 'Proxima Centauri',
    type: 'Star',
    classLabel: 'M5.5V RED DWARF · NEAREST STAR',
    distanceKm: 4.2465 * LIGHT_YEAR_KM,
    direction: [-0.4545, -0.6837, -0.5710],
    spectralType: 'M5.5Ve',
    summary:
      'The nearest star to the Sun, a faint red dwarf invisible to the naked eye. It hosts at least one planet — Proxima b — in its habitable zone, though violent flares complicate any assessment of habitability.',
    facts: [
      { text: 'Distance 1.3012 parsecs (4.2465 light-years) from Gaia parallax.', status: 'MEASURED', sourceIds: ['gaia-dr3'] },
      { text: 'Proxima b: a planet of at least 1.07 Earth masses orbiting every 11.2 days within the habitable zone.', status: 'OBSERVED', sourceIds: ['anglada-2016'] },
      { text: 'Frequent flares deliver X-ray and UV doses hundreds of times Earth’s; atmosphere retention on Proxima b is uncertain.', status: 'INFERRED', sourceIds: ['anglada-2016'] },
    ],
    biologicalInterest: 'HIGH',
    sourceIds: ['gaia-dr3', 'anglada-2016', 'recons'],
    navigable: false,
  },
  {
    id: 'alpha-centauri',
    name: 'Alpha Centauri A/B',
    type: 'Star',
    classLabel: 'G2V + K1V BINARY',
    distanceKm: 4.37 * LIGHT_YEAR_KM,
    direction: [-0.4600, -0.6860, -0.5640],
    spectralType: 'G2V / K1V',
    summary: 'A Sun-like pair 4.37 light-years away, bound to Proxima. The third-brightest star in the night sky.',
    facts: [{ text: 'Alpha Centauri A is slightly larger and brighter than the Sun; B is a cooler orange dwarf.', status: 'MEASURED', sourceIds: ['recons'] }],
    biologicalInterest: 'MODERATE',
    sourceIds: ['recons', 'gaia-dr3'],
    navigable: false,
  },
  {
    id: 'trappist-1',
    name: 'TRAPPIST-1',
    type: 'Star',
    classLabel: 'M8V ULTRACOOL DWARF · 7 PLANETS',
    distanceKm: 40.66 * LIGHT_YEAR_KM,
    direction: [0.8656, 0.4885, 0.1102],
    spectralType: 'M8V',
    summary: 'A star barely larger than Jupiter with seven Earth-sized planets, three or four in the habitable zone. The best laboratory for studying rocky worlds around red dwarfs.',
    facts: [{ text: 'Seven transiting Earth-sized planets, all closer to their star than Mercury is to the Sun.', status: 'OBSERVED', sourceIds: ['nasa-science'] }],
    biologicalInterest: 'HIGH',
    sourceIds: ['nasa-science', 'gaia-dr3'],
    navigable: false,
  },
  {
    id: 'galactic-centre',
    name: 'Galactic Centre (Sgr A*)',
    type: 'Star',
    classLabel: 'SUPERMASSIVE BLACK HOLE',
    distanceKm: 26_670 * LIGHT_YEAR_KM,
    direction: [-0.0533, -0.8697, -0.4908],
    summary: 'The centre of the Milky Way, hosting a black hole of 4 million solar masses. Light from there left 26,000 years ago, during the last ice age.',
    facts: [{ text: 'Sagittarius A* has a mass of ~4.3 million Suns, measured from stellar orbits; imaged by the Event Horizon Telescope in 2022.', status: 'MEASURED', sourceIds: ['nasa-science'] }],
    biologicalInterest: 'NONE',
    sourceIds: ['nasa-science'],
    navigable: false,
  },
];
