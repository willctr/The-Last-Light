/** Light-time and communication-delay helpers. */
import { C_KMS } from './units';

/** One-way light time in seconds across `km`. */
export const oneWayLightTimeS = (km: number): number => km / C_KMS;

/** Round-trip communication delay in seconds across `km`. */
export const roundTripLightTimeS = (km: number): number => (2 * km) / C_KMS;

/** Time for light to cross a distance expressed in light-years is, by definition, that many years. */
export const lightTimeYearsFromLy = (ly: number): number => ly;
