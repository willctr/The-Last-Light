/**
 * Scientific data model for THE LAST LIGHT.
 *
 * Every piece of content carries an epistemic status. The UI renders these with both a colour
 * and a label so meaning never depends on colour alone:
 *
 *   GREEN  — OBSERVED / MEASURED / STRONGLY_SUPPORTED   (established)
 *   BLUE   — INFERRED / POSSIBLE                          (plausible but uncertain)
 *   PURPLE — HYPOTHETICAL / SPECULATIVE / FICTIONAL_VISUALIZATION
 */
import type { OrbitElements } from '@/science/kepler';
import type { PropulsionProfile } from '@/science/transfer';

export type EpistemicStatus =
  | 'OBSERVED'
  | 'MEASURED'
  | 'STRONGLY_SUPPORTED'
  | 'INFERRED'
  | 'POSSIBLE'
  | 'HYPOTHETICAL'
  | 'SPECULATIVE'
  | 'FICTIONAL_VISUALIZATION';

export type EpistemicTier = 'ESTABLISHED' | 'PLAUSIBLE' | 'SPECULATIVE';

export function epistemicTier(status: EpistemicStatus): EpistemicTier {
  switch (status) {
    case 'OBSERVED':
    case 'MEASURED':
    case 'STRONGLY_SUPPORTED':
      return 'ESTABLISHED';
    case 'INFERRED':
    case 'POSSIBLE':
      return 'PLAUSIBLE';
    default:
      return 'SPECULATIVE';
  }
}

export interface Source {
  id: string;
  title: string;
  publisher: string;
  year?: number;
  url?: string;
  note?: string;
}

export interface Fact {
  text: string;
  status: EpistemicStatus;
  sourceIds?: string[];
}

export type BodyType =
  | 'Star'
  | 'Planet'
  | 'Moon'
  | 'DwarfPlanet'
  | 'Asteroid'
  | 'Comet'
  | 'Exoplanet'
  | 'BlackHole'
  | 'NeutronStar'
  | 'Galaxy'
  | 'Nebula'
  | 'Phenomenon'
  | 'HypotheticalObject'
  | 'Region';

export type HabitabilityFactorKey =
  | 'LIQUID_SOLVENT'
  | 'ENERGY_SOURCE'
  | 'COMPLEX_CHEMISTRY'
  | 'ATMOSPHERE'
  | 'TEMPERATURE'
  | 'STABILITY'
  | 'RADIATION'
  | 'MAGNETIC_ENVIRONMENT'
  | 'GEOLOGICAL_ACTIVITY'
  | 'ORGANIC_MOLECULES'
  | 'KNOWN_BIOSIGNATURES';

export const HABITABILITY_FACTOR_ORDER: HabitabilityFactorKey[] = [
  'LIQUID_SOLVENT',
  'ENERGY_SOURCE',
  'COMPLEX_CHEMISTRY',
  'ATMOSPHERE',
  'TEMPERATURE',
  'STABILITY',
  'RADIATION',
  'MAGNETIC_ENVIRONMENT',
  'GEOLOGICAL_ACTIVITY',
  'ORGANIC_MOLECULES',
  'KNOWN_BIOSIGNATURES',
];

export type FactorValue = 'CONFIRMED' | 'LIKELY' | 'POSSIBLE' | 'UNKNOWN' | 'UNFAVORABLE' | 'NOT_DETECTED';

export interface HabitabilityFactor {
  factor: HabitabilityFactorKey;
  value: FactorValue;
  note: string;
}

export type BiologicalInterest = 'HOME' | 'HIGH' | 'MODERATE' | 'LOW' | 'NONE';

/** Which of the procedural surface shaders renders this body. */
export type SurfaceShader =
  | 'sun'
  | 'rocky'
  | 'earth'
  | 'venus'
  | 'gas'
  | 'ice-giant'
  | 'ice-moon'
  | 'titan'
  | 'io'
  | 'pluto';

export interface RingSpec {
  innerKm: number;
  outerKm: number;
  /** Named bands for the procedural ring shader (fractions of [inner,outer]). */
  color: [number, number, number];
}

export interface AtmosphereSpec {
  color: [number, number, number];
  /** 0–1 strength of the limb glow. */
  strength: number;
  /** Extra thickness of the glow shell as a fraction of radius. */
  height: number;
}

export interface VisualParams {
  shader: SurfaceShader;
  /** Up to three palette colours (interpretation depends on shader). */
  colors: [[number, number, number], [number, number, number], [number, number, number]];
  /** Deterministic noise seed so each body looks the same on every visit. */
  seed: number;
  /** Feature scale of the procedural detail. */
  noiseScale?: number;
  /** Gas giant band frequency / contrast. */
  bands?: number;
  /** Polar ice cap extent (0 = none, 1 = whole sphere). */
  iceCap?: number;
  atmosphere?: AtmosphereSpec;
  rings?: RingSpec;
  /** Overall albedo multiplier. */
  albedo?: number;
  /** Emissive intensity for stars. */
  emissive?: number;
}

/** Common fields for every catalogued object. */
export interface ObjectBase {
  id: string;
  name: string;
  type: BodyType;
  /** Short class label shown on identification, e.g. "ICE MOON". */
  classLabel: string;
  summary: string;
  facts: Fact[];
  habitability?: HabitabilityFactor[];
  biologicalInterest: BiologicalInterest;
  sourceIds: string[];
  /** Notes on what is uncertain or simplified in this entry. */
  uncertainty?: string;
}

export interface OrbitSpec {
  elements: OrbitElements;
  /** Reference plane for `kepler` elements. Standish elements are always ecliptic. */
  frame: 'ecliptic' | 'parentEquator';
  /** Unit of the semi-major axis in `elements`. */
  unit: 'AU' | 'km';
  note?: string;
}

export interface CelestialBody extends ObjectBase {
  type: Exclude<BodyType, 'Region' | 'Phenomenon' | 'Galaxy' | 'Nebula'>;
  parentId: string | null;
  radiusKm: number;
  massKg?: number;
  meanTemperatureK?: number;
  /** Sidereal rotation period in days (negative = retrograde). */
  rotationPeriodDays?: number;
  axialTiltDeg?: number;
  composition?: string;
  atmosphere?: string;
  orbit?: OrbitSpec;
  visual: VisualParams;
  /** Hold-off distance for the autopilot, in body radii. */
  approachRadii?: number;
}

/** Diffuse regions: belts, shells, boundaries. Positioned by heliocentric distance. */
export interface Region extends ObjectBase {
  type: 'Region';
  kind: 'belt' | 'shell' | 'boundary';
  innerAU: number;
  outerAU: number;
  /** For boundaries: a representative navigation target point (AU, ecliptic). */
  targetPointAU?: [number, number, number];
  /** Approximate number of visual particles to render. */
  particleCount?: number;
  color: [number, number, number];
  /** Fraction of the belt population living in the ecliptic plane (thickness control). */
  thicknessAU?: number;
}

export interface DistantDestination extends ObjectBase {
  type: 'Star' | 'Exoplanet';
  /** Distance from the Sun in km. */
  distanceKm: number;
  /** Heliocentric ecliptic direction (unit vector). */
  direction: [number, number, number];
  hostStar?: string;
  spectralType?: string;
  /** Not navigable in the current build; shown in the nav database for scale intuition. */
  navigable: false;
}

export type CatalogObject = CelestialBody | Region | DistantDestination;

export interface DiscoveryEntry {
  objectId: string;
  index: number;
  /** Simulation seconds since J2000 when identified. */
  simTime: number;
  scanned: boolean;
}

export type { PropulsionProfile };
