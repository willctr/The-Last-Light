#!/usr/bin/env python3
"""Keplerian propagation in numpy, used to validate src/science/kepler.ts.

Two element flavours mirror the TypeScript module:
  * Standish mean elements with secular rates (JPL, 1800–2050) for the planets
  * fixed classical elements with a period for moons and dwarf planets

`--write-fixtures` samples positions on a set of dates and writes JSON that the vitest suite
compares against the TypeScript implementation (src/science/kepler.fixtures.test.ts).
"""
from __future__ import annotations

import argparse
import json
import math
import os
import sys
from dataclasses import dataclass
from typing import Dict, List, Tuple

import numpy as np

J2000_JD = 2451545.0
DAYS_PER_CENTURY = 36525.0
DEG = math.pi / 180.0


@dataclass
class Standish:
    a: float
    a_dot: float
    e: float
    e_dot: float
    i: float
    i_dot: float
    L: float
    L_dot: float
    long_peri: float
    long_peri_dot: float
    long_node: float
    long_node_dot: float


@dataclass
class Kepler:
    a: float
    e: float
    i: float
    Omega: float
    omega: float
    M0: float
    epoch_jd: float
    period_days: float


# Same values as src/data/bodies/planets.ts (Standish, JPL approx_pos).
PLANETS: Dict[str, Standish] = {
    "mercury": Standish(0.38709927, 0.00000037, 0.20563593, 0.00001906, 7.00497902, -0.00594749,
                        252.25032350, 149472.67411175, 77.45779628, 0.16047689, 48.33076593, -0.12534081),
    "venus": Standish(0.72333566, 0.00000390, 0.00677672, -0.00004107, 3.39467605, -0.00078890,
                      181.97909950, 58517.81538729, 131.60246718, 0.00268329, 76.67984255, -0.27769418),
    "earth": Standish(1.00000261, 0.00000562, 0.01671123, -0.00004392, -0.00001531, -0.01294668,
                      100.46457166, 35999.37244981, 102.93768193, 0.32327364, 0.0, 0.0),
    "mars": Standish(1.52371034, 0.00001847, 0.09339410, 0.00007882, 1.84969142, -0.00813131,
                     -4.55343205, 19140.30268499, -23.94362959, 0.44441088, 49.55953891, -0.29257343),
    "jupiter": Standish(5.20288700, -0.00011607, 0.04838624, -0.00013253, 1.30439695, -0.00183714,
                        34.39644051, 3034.74612775, 14.72847983, 0.21252668, 100.47390909, 0.20469106),
    "saturn": Standish(9.53667594, -0.00125060, 0.05386179, -0.00050991, 2.48599187, 0.00193609,
                       49.95424423, 1222.49362201, 92.59887831, -0.41897216, 113.66242448, -0.28867794),
    "uranus": Standish(19.18916464, -0.00196176, 0.04725744, -0.00004397, 0.77263783, -0.00242939,
                       313.23810451, 428.48202785, 170.95427630, 0.40805281, 74.01692503, 0.04240589),
    "neptune": Standish(30.06992276, 0.00026291, 0.00859048, 0.00005105, 1.77004347, 0.00035372,
                        -55.12002969, 218.45945325, 44.96476227, -0.32241464, 131.78422574, -0.00508664),
    "pluto": Standish(39.48211675, -0.00031596, 0.24882730, 0.00005170, 17.14001206, 0.00004818,
                      238.92903833, 145.20780515, 224.06891629, -0.04062942, 110.30393684, -0.01183482),
}

MOONS: Dict[str, Kepler] = {
    "moon": Kepler(384400.0, 0.0549, 5.145, 125.0, 318.0, 135.0, 2459200.5, 27.321661),
    "europa": Kepler(671100.0, 0.0094, 0.47, 0.0, 0.0, 120.0, 2459200.5, 3.551181),
    "titan": Kepler(1221870.0, 0.0288, 0.35, 0.0, 0.0, 20.0, 2459200.5, 15.945421),
    "triton": Kepler(354759.0, 0.00002, 157.0, 0.0, 0.0, 45.0, 2459200.5, 5.876854),
}


def solve_kepler(M: np.ndarray, e: float) -> np.ndarray:
    """Newton iteration for E - e sin E = M (vectorised)."""
    M = np.mod(M, 2 * math.pi)
    E = np.where(e < 0.8, M, math.pi) * np.ones_like(M)
    for _ in range(40):
        f = E - e * np.sin(E) - M
        fp = 1 - e * np.cos(E)
        dE = f / fp
        E = E - dE
        if np.all(np.abs(dE) < 1e-13):
            break
    return E


def perifocal_to_reference(xp: np.ndarray, yp: np.ndarray, omega: float, Omega: float, inc: float) -> np.ndarray:
    cw, sw = math.cos(omega), math.sin(omega)
    cO, sO = math.cos(Omega), math.sin(Omega)
    ci, si = math.cos(inc), math.sin(inc)
    x = (cw * cO - sw * sO * ci) * xp + (-sw * cO - cw * sO * ci) * yp
    y = (cw * sO + sw * cO * ci) * xp + (-sw * sO + cw * cO * ci) * yp
    z = (sw * si) * xp + (cw * si) * yp
    return np.stack([x, y, z], axis=-1)


def standish_position(el: Standish, jd: float) -> np.ndarray:
    T = (jd - J2000_JD) / DAYS_PER_CENTURY
    a = el.a + el.a_dot * T
    e = el.e + el.e_dot * T
    inc = (el.i + el.i_dot * T) * DEG
    L = (el.L + el.L_dot * T) * DEG
    lp = (el.long_peri + el.long_peri_dot * T) * DEG
    ln = (el.long_node + el.long_node_dot * T) * DEG
    omega = lp - ln
    M = L - lp
    E = solve_kepler(np.array([M]), e)
    xp = a * (np.cos(E) - e)
    yp = a * math.sqrt(1 - e * e) * np.sin(E)
    return perifocal_to_reference(xp, yp, omega, ln, inc)[0]


def kepler_position(el: Kepler, jd: float) -> np.ndarray:
    n = 2 * math.pi / el.period_days
    M = el.M0 * DEG + n * (jd - el.epoch_jd)
    E = solve_kepler(np.array([M]), el.e)
    xp = el.a * (np.cos(E) - el.e)
    yp = el.a * math.sqrt(1 - el.e * el.e) * np.sin(E)
    return perifocal_to_reference(xp, yp, el.omega * DEG, el.Omega * DEG, el.i * DEG)[0]


def sample_dates() -> List[Tuple[str, float]]:
    return [
        ("J2000", J2000_JD),
        ("2010-06-15", 2455362.5),
        ("2020-12-17", 2459200.5),
        ("2026-09-18", 2461301.5),
        ("2035-01-01", 2464328.5),
        ("2049-12-31", 2469806.5),
    ]


def build_fixtures() -> dict:
    out = {"planets": {}, "moons": {}, "note": "Generated by scripts/astronomy/kepler.py; compared against src/science/kepler.ts"}
    for name, el in PLANETS.items():
        out["planets"][name] = {label: standish_position(el, jd).tolist() for label, jd in sample_dates()}
    for name, el in MOONS.items():
        out["moons"][name] = {label: kepler_position(el, jd).tolist() for label, jd in sample_dates()}
    return out


def main(argv: List[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--write-fixtures", action="store_true", help="write src/science/__fixtures__/kepler.json")
    parser.add_argument("--jd", type=float, default=None, help="print heliocentric planet positions (AU) at this Julian Date")
    args = parser.parse_args(argv)

    if args.write_fixtures:
        root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        path = os.path.join(root, "src", "science", "__fixtures__", "kepler.json")
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w") as f:
            json.dump(build_fixtures(), f, indent=1)
        print(f"wrote {path}")
        return 0

    jd = args.jd if args.jd is not None else J2000_JD
    print(f"Heliocentric ecliptic positions at JD {jd:.1f} (AU)")
    for name, el in PLANETS.items():
        p = standish_position(el, jd)
        r = float(np.linalg.norm(p))
        lon = math.degrees(math.atan2(p[1], p[0])) % 360
        print(f"  {name:8s} x={p[0]:+9.4f} y={p[1]:+9.4f} z={p[2]:+8.4f}  r={r:7.4f}  lon={lon:6.1f}°")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
