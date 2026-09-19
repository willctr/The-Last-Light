import type { CelestialBody, OrbitSpec } from '../types';

/**
 * Dwarf planets. Orbital elements are approximate osculating elements near epoch 2020-12-17;
 * mean anomalies are estimated from published perihelion/aphelion dates and are not authoritative.
 */
const EPOCH = 2_459_200.5;

function dwarfOrbit(aAU: number, e: number, i: number, Omega: number, omega: number, M0: number, periodDays: number): OrbitSpec {
  return {
    frame: 'ecliptic',
    unit: 'AU',
    note: 'Approximate elements; orbital phase estimated, not from an ephemeris.',
    elements: { kind: 'kepler', a: aAU, e, i, Omega, omega, M0, epochJD: EPOCH, periodDays },
  };
}

export const DWARF_PLANETS: CelestialBody[] = [
  {
    id: 'ceres',
    name: 'Ceres',
    type: 'DwarfPlanet',
    classLabel: 'DWARF PLANET · ASTEROID BELT',
    parentId: 'sun',
    radiusKm: 469.7,
    massKg: 9.3835e20,
    meanTemperatureK: 168,
    rotationPeriodDays: 0.3781,
    axialTiltDeg: 4,
    composition: 'Rock and ~25% water ice; hydrated minerals, salts and organics on the surface.',
    atmosphere: 'Transient water-vapour exosphere.',
    summary:
      'The largest object in the asteroid belt and the only dwarf planet in the inner Solar System. Dawn found bright salt deposits left by brines that seeped to the surface — evidence of a relict subsurface ocean — and aliphatic organic molecules.',
    facts: [
      { text: 'Bright spots in Occator crater are sodium-carbonate salts deposited by upwelling brines.', status: 'STRONGLY_SUPPORTED', sourceIds: ['nasa-science'] },
      { text: 'Aliphatic organic compounds were detected on the surface near Ernutet crater.', status: 'OBSERVED', sourceIds: ['desanctis-2017'] },
      { text: 'A deep brine reservoir may persist beneath the crust today.', status: 'POSSIBLE', sourceIds: ['nasa-science'] },
      { text: 'First asteroid discovered (Piazzi, 1801); reclassified as a dwarf planet in 2006.', status: 'OBSERVED', sourceIds: ['nasa-science'] },
    ],
    habitability: [
      { factor: 'LIQUID_SOLVENT', value: 'POSSIBLE', note: 'Relict brines; possible deep reservoir.' },
      { factor: 'ORGANIC_MOLECULES', value: 'CONFIRMED', note: 'Aliphatic organics on the surface.' },
      { factor: 'ENERGY_SOURCE', value: 'UNKNOWN', note: '' },
      { factor: 'KNOWN_BIOSIGNATURES', value: 'NOT_DETECTED', note: '' },
    ],
    biologicalInterest: 'MODERATE',
    sourceIds: ['nasa-ssd', 'desanctis-2017', 'nasa-science'],
    orbit: dwarfOrbit(2.766, 0.0785, 10.59, 80.27, 73.6, 206, 1680),
    visual: { shader: 'rocky', colors: [[0.36, 0.34, 0.31], [0.2, 0.19, 0.18], [0.6, 0.58, 0.55]], seed: 51, noiseScale: 6 },
    approachRadii: 5,
  },
  {
    id: 'pluto',
    name: 'Pluto',
    type: 'DwarfPlanet',
    classLabel: 'DWARF PLANET · KUIPER BELT',
    parentId: 'sun',
    radiusKm: 1188.3,
    massKg: 1.303e22,
    meanTemperatureK: 44,
    rotationPeriodDays: -6.3872,
    axialTiltDeg: 122.53,
    composition: 'Rocky core, water-ice mantle; surface of nitrogen, methane and CO ices.',
    atmosphere: 'Thin N₂ with CH₄ and CO; ~10 microbar; hazy.',
    summary:
      'The first Kuiper Belt object discovered, in 1930. New Horizons in 2015 revealed a world nobody expected: a vast, craterless nitrogen-ice glacier (Sputnik Planitia), mountains of water ice, and a blue haze. Its heart-shaped plain is younger than 10 million years — and something is still moving beneath it.',
    facts: [
      { text: 'Sputnik Planitia is a nitrogen-ice glacier with convection cells and no craters — geologically active today.', status: 'OBSERVED', sourceIds: ['stern-2015'] },
      { text: 'A subsurface water ocean is possible, suggested by the position and geometry of Sputnik Planitia.', status: 'POSSIBLE', sourceIds: ['stern-2015'] },
      { text: 'Its orbit crosses inside Neptune’s but a 3:2 resonance prevents close encounters.', status: 'MEASURED', sourceIds: ['nasa-ssd'] },
      { text: 'Reclassified as a dwarf planet in 2006 by the IAU.', status: 'OBSERVED', sourceIds: ['nasa-science'] },
    ],
    habitability: [
      { factor: 'LIQUID_SOLVENT', value: 'POSSIBLE', note: 'Subsurface water ocean suggested by geology.' },
      { factor: 'TEMPERATURE', value: 'UNFAVORABLE', note: 'Surface ~44 K.' },
      { factor: 'GEOLOGICAL_ACTIVITY', value: 'CONFIRMED', note: 'Active nitrogen glacier.' },
      { factor: 'ORGANIC_MOLECULES', value: 'CONFIRMED', note: 'Tholins colour the surface.' },
      { factor: 'KNOWN_BIOSIGNATURES', value: 'NOT_DETECTED', note: '' },
    ],
    biologicalInterest: 'LOW',
    sourceIds: ['nasa-ssd', 'stern-2015', 'standish-2006'],
    orbit: {
      frame: 'ecliptic',
      unit: 'AU',
      elements: {
        kind: 'standish',
        a: 39.48211675, aDot: -0.00031596,
        e: 0.2488273, eDot: 0.0000517,
        i: 17.14001206, iDot: 0.00004818,
        L: 238.92903833, LDot: 145.20780515,
        longPeri: 224.06891629, longPeriDot: -0.04062942,
        longNode: 110.30393684, longNodeDot: -0.01183482,
      },
    },
    visual: { shader: 'pluto', colors: [[0.72, 0.58, 0.45], [0.35, 0.24, 0.18], [0.94, 0.9, 0.85]], seed: 52, noiseScale: 3 },
  },
  {
    id: 'haumea',
    name: 'Haumea',
    type: 'DwarfPlanet',
    classLabel: 'DWARF PLANET · KUIPER BELT',
    parentId: 'sun',
    radiusKm: 780,
    massKg: 4.006e21,
    meanTemperatureK: 50,
    rotationPeriodDays: 0.1631,
    composition: 'Rocky interior with a thin crystalline water-ice surface.',
    summary:
      'A dwarf planet spinning so fast — one rotation every 3.9 hours — that it has been stretched into an ellipsoid roughly 2,100 × 1,700 × 1,100 km. It has two moons and, surprisingly, a ring.',
    facts: [
      { text: 'Fastest-rotating large body known in the Solar System (3.9 h).', status: 'MEASURED', sourceIds: ['ortiz-2017'] },
      { text: 'A ring was discovered by stellar occultation in 2017.', status: 'OBSERVED', sourceIds: ['ortiz-2017'] },
      { text: 'Its shape and family of icy fragments suggest an ancient giant collision.', status: 'INFERRED', sourceIds: ['nasa-science'] },
    ],
    biologicalInterest: 'NONE',
    uncertainty: 'Radius given is a volume-equivalent mean for a strongly elongated body.',
    sourceIds: ['nasa-ssd', 'ortiz-2017'],
    orbit: dwarfOrbit(43.12, 0.196, 28.2, 122.2, 239, 216, 103_370),
    visual: { shader: 'ice-moon', colors: [[0.82, 0.82, 0.8], [0.6, 0.6, 0.62], [0.96, 0.96, 0.95]], seed: 53, noiseScale: 5 },
  },
  {
    id: 'makemake',
    name: 'Makemake',
    type: 'DwarfPlanet',
    classLabel: 'DWARF PLANET · KUIPER BELT',
    parentId: 'sun',
    radiusKm: 715,
    massKg: 3.1e21,
    meanTemperatureK: 40,
    rotationPeriodDays: 0.9511,
    composition: 'Methane, ethane and nitrogen ices; reddish tholins.',
    summary: 'A bright, reddish Kuiper Belt dwarf planet coated in frozen methane. It has one known moon and possibly recent internal heat hinted at by JWST detections of methane and ethane.',
    facts: [
      { text: 'Surface dominated by methane ice, with ethane and tholins.', status: 'OBSERVED', sourceIds: ['nasa-science'] },
      { text: 'Mass is poorly constrained; the value here is an estimate.', status: 'INFERRED', sourceIds: ['nasa-ssd'] },
    ],
    biologicalInterest: 'NONE',
    uncertainty: 'Mass uncertain to tens of percent.',
    sourceIds: ['nasa-ssd', 'nasa-science'],
    orbit: dwarfOrbit(45.43, 0.161, 29.0, 79.4, 296.5, 165, 111_770),
    visual: { shader: 'rocky', colors: [[0.66, 0.46, 0.36], [0.4, 0.26, 0.2], [0.85, 0.72, 0.62]], seed: 54, noiseScale: 4 },
  },
  {
    id: 'eris',
    name: 'Eris',
    type: 'DwarfPlanet',
    classLabel: 'DWARF PLANET · SCATTERED DISC',
    parentId: 'sun',
    radiusKm: 1163,
    massKg: 1.66e22,
    meanTemperatureK: 42,
    rotationPeriodDays: 1.08,
    composition: 'Rock and ice; a highly reflective methane-ice surface.',
    summary:
      'Slightly smaller than Pluto but 27% more massive, Eris was the discovery in 2005 that forced the definition of "planet". Its highly eccentric orbit carries it to nearly 98 AU — currently near aphelion, three times farther than Pluto.',
    facts: [
      { text: 'Mass measured from its moon Dysnomia: 27% greater than Pluto.', status: 'MEASURED', sourceIds: ['brown-2007'] },
      { text: 'Radius measured by stellar occultation: ~1,163 km, almost identical to Pluto.', status: 'MEASURED', sourceIds: ['sicardy-2011'] },
      { text: 'One of the most reflective objects in the Solar System (albedo ~0.96), likely frost of collapsed atmosphere.', status: 'INFERRED', sourceIds: ['sicardy-2011'] },
    ],
    biologicalInterest: 'NONE',
    sourceIds: ['nasa-ssd', 'brown-2007', 'sicardy-2011'],
    orbit: dwarfOrbit(67.86, 0.4358, 44.04, 35.95, 151.4, 208, 204_020),
    visual: { shader: 'ice-moon', colors: [[0.88, 0.88, 0.86], [0.65, 0.66, 0.68], [0.98, 0.98, 0.97]], seed: 55, noiseScale: 5, albedo: 1.1 },
  },
];
