import { SUN } from './bodies/sun';
import { PLANETS } from './bodies/planets';
import { MOONS } from './bodies/moons';
import { DWARF_PLANETS } from './bodies/dwarfs';
import { REGIONS } from './bodies/regions';
import { DISTANT_DESTINATIONS } from './bodies/destinations';
import type { CatalogObject, CelestialBody, DistantDestination, Region } from './types';

export const BODIES: CelestialBody[] = [SUN, ...PLANETS, ...MOONS, ...DWARF_PLANETS];
export const CATALOG: CatalogObject[] = [...BODIES, ...REGIONS, ...DISTANT_DESTINATIONS];

export const CATALOG_BY_ID: Record<string, CatalogObject> = Object.fromEntries(CATALOG.map((o) => [o.id, o]));
export const BODY_BY_ID: Record<string, CelestialBody> = Object.fromEntries(BODIES.map((b) => [b.id, b]));

export function getObject(id: string): CatalogObject | undefined {
  return CATALOG_BY_ID[id];
}

export function isBody(o: CatalogObject | undefined): o is CelestialBody {
  return !!o && 'radiusKm' in o;
}

export function isRegion(o: CatalogObject | undefined): o is Region {
  return !!o && o.type === 'Region';
}

export function isDistant(o: CatalogObject | undefined): o is DistantDestination {
  return !!o && 'navigable' in o;
}

export function childrenOf(parentId: string): CelestialBody[] {
  return BODIES.filter((b) => b.parentId === parentId);
}

export { SUN, PLANETS, MOONS, DWARF_PLANETS, REGIONS, DISTANT_DESTINATIONS };
export * from './types';
export { SOURCES, SOURCE_BY_ID } from './science/sources';
export { PROPULSION_PROFILES, PROPULSION_BY_ID, AURORA_DEFAULT_PROPULSION_ID, AURORA_DELTA_V_KMS } from './propulsion/profiles';
