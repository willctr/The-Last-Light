import { describe, expect, it } from 'vitest';
import { Ephemeris } from './ephemeris';
import { BODIES } from '@/data';
import { J2000_JD, AU_KM } from './units';
import { add, distance, length } from './vec3';

const eph = new Ephemeris(BODIES);
const states = eph.compute(J2000_JD);

describe('ephemeris', () => {
  it('places moons near their parents in both real and visual space', () => {
    const jupiter = states.get('jupiter')!;
    const europa = states.get('europa')!;
    const dKm = distance(jupiter.realPosAU, europa.realPosAU) * AU_KM;
    expect(dKm).toBeGreaterThan(671_100 * (1 - 0.0094) - 1);
    expect(dKm).toBeLessThan(671_100 * (1 + 0.0094) + 1);
    expect(distance(jupiter.visPos, europa.visPos)).toBeLessThan(jupiter.influenceVis);
    expect(distance(jupiter.visPos, europa.visPos)).toBeGreaterThan(jupiter.visRadius);
  });
  it('resolves a point near Europa to Europa, not Jupiter', () => {
    const europa = states.get('europa')!;
    const p = add(europa.visPos, [0, 0, europa.visRadius * 2.7]);
    const f = eph.resolveFrame(p, states);
    expect(f.frameId).toBe('europa');
    const dKm = distance(f.realPosAU, europa.realPosAU) * AU_KM;
    expect(dKm).toBeGreaterThan(1560 * 2);
    expect(dKm).toBeLessThan(1560 * 6);
  });
  it('resolves open space to the heliocentric frame with an invertible distance', () => {
    const f = eph.resolveFrame([0, 300, 0], states);
    expect(f.frameId).toBe('sun');
    expect(length(f.realPosAU)).toBeCloseTo(Math.pow(3, 1 / 0.56), 6);
  });
  it('velocities are physically reasonable', () => {
    expect(length(states.get('earth')!.realVelKms)).toBeGreaterThan(29);
    expect(length(states.get('earth')!.realVelKms)).toBeLessThan(31);
    expect(length(states.get('neptune')!.realVelKms)).toBeGreaterThan(5);
    expect(length(states.get('neptune')!.realVelKms)).toBeLessThan(6);
  });
});
