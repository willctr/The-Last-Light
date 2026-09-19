import type { Region } from '../types';

/** Direction of the heliosphere "nose" (upwind of the interstellar flow), ecliptic J2000, approx. */
const NOSE_DIR: [number, number, number] = [-0.258, -0.962, 0.087];

export const REGIONS: Region[] = [
  {
    id: 'asteroid-belt',
    name: 'Asteroid Belt',
    type: 'Region',
    kind: 'belt',
    classLabel: 'MAIN BELT',
    innerAU: 2.1,
    outerAU: 3.3,
    thicknessAU: 0.35,
    particleCount: 14_000,
    color: [0.55, 0.5, 0.45],
    summary:
      'Between Mars and Jupiter, millions of rocky bodies that never assembled into a planet — Jupiter’s gravity stirred them too violently. Despite the movies, the belt is mostly empty: spacecraft cross it routinely without dodging anything. Its total mass is about 3% of the Moon.',
    facts: [
      { text: 'Total mass is roughly 3% of the Moon; Ceres holds about a third of it.', status: 'MEASURED', sourceIds: ['nasa-science'] },
      { text: 'Average spacing between kilometre-sized asteroids is on the order of a million kilometres.', status: 'INFERRED', sourceIds: ['nasa-science'] },
      { text: 'Carbonaceous asteroids preserve water and organics from the early Solar System; samples returned from Ryugu and Bennu contain amino acids.', status: 'OBSERVED', sourceIds: ['nasa-science'] },
    ],
    biologicalInterest: 'MODERATE',
    sourceIds: ['nasa-science', 'nasa-ssd'],
  },
  {
    id: 'kuiper-belt',
    name: 'Kuiper Belt',
    type: 'Region',
    kind: 'belt',
    classLabel: 'TRANS-NEPTUNIAN DISC',
    innerAU: 30,
    outerAU: 50,
    thicknessAU: 6,
    particleCount: 12_000,
    color: [0.5, 0.6, 0.75],
    summary:
      'A disc of icy bodies beyond Neptune — the frozen leftovers of planet formation. Pluto, Haumea and Makemake live here. The first object besides Pluto was found only in 1992. Short-period comets fall inward from this region.',
    facts: [
      { text: 'First Kuiper Belt object after Pluto (1992 QB1) discovered by Jewitt and Luu.', status: 'OBSERVED', sourceIds: ['jewitt-1993'] },
      { text: 'Contains perhaps 100,000 bodies larger than 100 km, but total mass is only a few percent of Earth’s.', status: 'INFERRED', sourceIds: ['nasa-science'] },
      { text: 'New Horizons flew past the Kuiper Belt object Arrokoth in 2019 — a pristine contact binary.', status: 'OBSERVED', sourceIds: ['nasa-science'] },
    ],
    biologicalInterest: 'LOW',
    sourceIds: ['jewitt-1993', 'nasa-science'],
  },
  {
    id: 'heliopause',
    name: 'Heliopause',
    type: 'Region',
    kind: 'boundary',
    classLabel: 'BOUNDARY OF THE HELIOSPHERE',
    innerAU: 119,
    outerAU: 122,
    targetPointAU: [NOSE_DIR[0] * 121, NOSE_DIR[1] * 121, NOSE_DIR[2] * 121],
    color: [0.3, 0.55, 0.8],
    summary:
      'The edge of the Sun’s influence: where the solar wind, thinned by distance, stalls against the interstellar medium. Voyager 1 crossed it in August 2012 at 121.6 AU and Voyager 2 in November 2018 at 119 AU. Beyond lies interstellar space — though the Sun’s gravity still reaches a thousand times farther.',
    facts: [
      { text: 'Voyager 1 crossed the heliopause in August 2012 at about 121.6 AU.', status: 'OBSERVED', sourceIds: ['stone-2013'] },
      { text: 'Voyager 2 crossed in November 2018 at about 119 AU, confirming the boundary is sharp and roughly symmetric in that direction.', status: 'OBSERVED', sourceIds: ['stone-2019'] },
      { text: 'The heliosphere is shaped by the Sun’s motion through the interstellar medium; its exact shape (comet-like tail vs. croissant) is debated.', status: 'INFERRED', sourceIds: ['mccomas-2009'] },
      { text: 'The heliopause is not the edge of the Solar System: the Oort Cloud and the Sun’s gravitational reach extend far beyond.', status: 'STRONGLY_SUPPORTED', sourceIds: ['nasa-voyager'] },
    ],
    biologicalInterest: 'NONE',
    uncertainty: 'Rendered as a sphere of ~120 AU; the real boundary is asymmetric and varies with the solar cycle.',
    sourceIds: ['stone-2013', 'stone-2019', 'mccomas-2009', 'nasa-voyager'],
  },
  {
    id: 'oort-cloud',
    name: 'Oort Cloud',
    type: 'Region',
    kind: 'shell',
    classLabel: 'HYPOTHESISED COMET RESERVOIR',
    innerAU: 2_000,
    outerAU: 100_000,
    particleCount: 6_000,
    color: [0.45, 0.5, 0.65],
    summary:
      'A vast spherical reservoir of trillions of icy bodies, proposed by Jan Oort in 1950 to explain where long-period comets come from. No object has ever been observed in place there; its existence is inferred from cometary orbits. It may extend a quarter of the way to the nearest star.',
    facts: [
      { text: 'Inferred from the orbits of long-period comets, which arrive from all directions with aphelia of tens of thousands of AU.', status: 'INFERRED', sourceIds: ['oort-1950'] },
      { text: 'No Oort Cloud object has been directly observed at its home distance.', status: 'STRONGLY_SUPPORTED', sourceIds: ['nasa-science'] },
      { text: 'Voyager 1, travelling 17 km/s, would take ~300 years to reach the inner edge and ~30,000 years to pass through.', status: 'INFERRED', sourceIds: ['nasa-voyager'] },
    ],
    biologicalInterest: 'NONE',
    uncertainty: 'Inner and outer radii are model-dependent; the rendering is conceptual.',
    sourceIds: ['oort-1950', 'nasa-voyager', 'nasa-science'],
  },
];
