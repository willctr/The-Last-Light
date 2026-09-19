/**
 * Cross-checks the TypeScript Kepler solver against positions computed independently in
 * numpy (scripts/astronomy/kepler.py --write-fixtures).
 */
import { describe, expect, it } from 'vitest';
import fixtures from './__fixtures__/kepler.json';
import { keplerPosition, standishPosition } from './kepler';
import { PLANETS } from '@/data/bodies/planets';
import { DWARF_PLANETS } from '@/data/bodies/dwarfs';
import { MOONS } from '@/data/bodies/moons';

const DATES: Record<string, number> = {
  J2000: 2451545.0,
  '2010-06-15': 2455362.5,
  '2020-12-17': 2459200.5,
  '2026-09-18': 2461301.5,
  '2035-01-01': 2464328.5,
  '2049-12-31': 2469806.5,
};

type Fixture = { planets: Record<string, Record<string, number[]>>; moons: Record<string, Record<string, number[]>> };
const fx = fixtures as unknown as Fixture;

describe('kepler vs numpy fixtures', () => {
  it('planet positions agree to 1e-9 AU', () => {
    const all = [...PLANETS, ...DWARF_PLANETS];
    for (const [name, byDate] of Object.entries(fx.planets)) {
      const body = all.find((b) => b.id === name)!;
      expect(body, name).toBeDefined();
      const el = body.orbit!.elements;
      expect(el.kind).toBe('standish');
      if (el.kind !== 'standish') continue;
      for (const [label, expected] of Object.entries(byDate)) {
        const p = standishPosition(el, DATES[label]);
        for (let k = 0; k < 3; k++) expect(Math.abs(p[k] - expected[k]), `${name} ${label} axis ${k}`).toBeLessThan(1e-9);
      }
    }
  });
  it('moon positions agree to 1e-6 km', () => {
    for (const [name, byDate] of Object.entries(fx.moons)) {
      const body = MOONS.find((b) => b.id === name)!;
      const el = body.orbit!.elements;
      expect(el.kind).toBe('kepler');
      if (el.kind !== 'kepler') continue;
      for (const [label, expected] of Object.entries(byDate)) {
        const p = keplerPosition(el, DATES[label]);
        for (let k = 0; k < 3; k++) expect(Math.abs(p[k] - expected[k]), `${name} ${label} axis ${k}`).toBeLessThan(1e-6);
      }
    }
  });
});
