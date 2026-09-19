import type { CelestialBody } from '../types';

export const SUN: CelestialBody = {
  id: 'sun',
  name: 'Sun',
  type: 'Star',
  classLabel: 'G2V MAIN-SEQUENCE STAR',
  parentId: null,
  radiusKm: 695_700,
  massKg: 1.9885e30,
  meanTemperatureK: 5772,
  rotationPeriodDays: 25.05,
  axialTiltDeg: 7.25,
  composition: 'Hydrogen ~73%, helium ~25% by mass; heavier elements ~2%.',
  summary:
    'The star at the centre of the Solar System: a middle-aged yellow dwarf, 4.6 billion years old, fusing about 600 million tonnes of hydrogen per second. Its light takes 8.3 minutes to reach Earth. Every gram of every planet, moon and person condensed from the same cloud that formed it.',
  facts: [
    { text: 'Effective surface temperature 5,772 K; the core is about 15 million K.', status: 'MEASURED', sourceIds: ['nasa-factsheets'] },
    { text: 'Contains 99.86% of the mass of the Solar System.', status: 'MEASURED', sourceIds: ['nasa-factsheets'] },
    { text: 'Energy comes from proton–proton chain fusion of hydrogen into helium in the core.', status: 'STRONGLY_SUPPORTED', sourceIds: ['nasa-science'] },
    { text: 'The solar wind — a stream of charged particles — inflates the heliosphere, a bubble that extends beyond 120 AU.', status: 'OBSERVED', sourceIds: ['nasa-voyager', 'stone-2013'] },
    { text: 'In roughly 5 billion years the Sun will exhaust core hydrogen and expand into a red giant, likely engulfing Mercury and Venus.', status: 'STRONGLY_SUPPORTED', sourceIds: ['nasa-science'] },
    { text: 'Parker Solar Probe has flown through the corona, within about 6.1 million km of the visible surface.', status: 'OBSERVED', sourceIds: ['psp'] },
  ],
  biologicalInterest: 'MODERATE',
  uncertainty: 'The Sun is the best-studied star. Its long-term luminosity evolution is modelled, not observed.',
  sourceIds: ['nasa-factsheets', 'nasa-science', 'psp'],
  visual: {
    shader: 'sun',
    colors: [
      [1.0, 0.82, 0.5],
      [1.0, 0.55, 0.18],
      [1.0, 0.96, 0.85],
    ],
    seed: 1,
    emissive: 2.2,
  },
  approachRadii: 4,
};
