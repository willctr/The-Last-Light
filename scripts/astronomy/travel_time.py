#!/usr/bin/env python3
"""Travel-time tables for the propulsion concept catalogue.

Mirrors src/science/transfer.ts: constant-acceleration brachistochrone, Δv-limited coast, or
cruise flyby. Straight-line distances, no gravity, non-relativistic. Prints a table for a set of
destinations so the numbers in the UI can be sanity-checked offline.
"""
from __future__ import annotations

import math
import sys
from dataclasses import dataclass
from typing import List, Optional

C_KMS = 299792.458
AU_KM = 149597870.7
LY_KM = 9460730472580.8
YEAR_S = 365.25 * 86400


@dataclass
class Profile:
    name: str
    status: str
    accel_ms2: float
    dv_budget_kms: float
    decelerates: bool
    cruise_c: Optional[float] = None


PROFILES: List[Profile] = [
    Profile("Chemical", "DEMONSTRATED", 10.0, 12.0, True),
    Profile("Nuclear thermal", "PROPOSED", 3.0, 22.0, True),
    Profile("Nuclear electric (AURORA-01)", "PROPOSED", 1e-3, 240.0, True),
    Profile("Solar sail", "DEMONSTRATED", 5e-5, 60.0, False),
    Profile("Fusion (Daedalus-class)", "THEORETICAL", 0.25, 36000.0, False),
    Profile("Laser sail (Starshot)", "PROPOSED", 0.0, math.inf, False, cruise_c=0.2),
    Profile("Antimatter", "SPECULATIVE", 1.0, 120000.0, True),
]

DESTINATIONS = [
    ("Moon", 384400.0),
    ("Mars (closest)", 78e6),
    ("Jupiter (~4.2 AU)", 4.2 * AU_KM),
    ("Neptune (~29 AU)", 29 * AU_KM),
    ("Heliopause (120 AU)", 120 * AU_KM),
    ("Inner Oort (2,000 AU)", 2000 * AU_KM),
    ("Proxima Centauri", 4.2465 * LY_KM),
    ("TRAPPIST-1", 40.66 * LY_KM),
    ("Galactic centre", 26670 * LY_KM),
]


def travel_time_s(d_km: float, p: Profile) -> float:
    if p.cruise_c is not None:
        return d_km / (p.cruise_c * C_KMS)
    d = d_km * 1000.0
    a = p.accel_ms2
    if a <= 0:
        return math.inf
    k = 2 if p.decelerates else 1
    v_peak = math.sqrt(a * d) if p.decelerates else math.sqrt(2 * a * d)
    v_max = (p.dv_budget_kms * 1000.0) / k
    if v_peak <= v_max:
        t_half = v_peak / a
        return t_half * k
    t_acc = v_max / a
    d_acc = 0.5 * a * t_acc * t_acc
    d_coast = max(0.0, d - d_acc * k)
    return t_acc * k + d_coast / v_max


def fmt(seconds: float) -> str:
    if not math.isfinite(seconds):
        return "—"
    if seconds < 3600:
        return f"{seconds / 60:.0f} min"
    if seconds < 86400 * 2:
        return f"{seconds / 3600:.1f} h"
    if seconds < YEAR_S * 2:
        return f"{seconds / 86400:.0f} d"
    y = seconds / YEAR_S
    if y < 1e4:
        return f"{y:,.1f} yr"
    if y < 1e6:
        return f"{y:,.0f} yr"
    return f"{y / 1e6:.2f} Myr"


def main() -> int:
    names = [p.name for p in PROFILES]
    width = max(len(n) for n in names) + 2
    header = "Destination".ljust(24) + "Light".rjust(11) + "".join(n.rjust(max(len(n) + 2, 14)) for n in names)
    print(header)
    print("-" * len(header))
    for label, d_km in DESTINATIONS:
        row = label.ljust(24) + fmt(d_km / C_KMS).rjust(11)
        for p in PROFILES:
            row += fmt(travel_time_s(d_km, p)).rjust(max(len(p.name) + 2, 14))
        print(row)
    print()
    print("Statuses:", ", ".join(f"{p.name}={p.status}" for p in PROFILES))
    print("Assumptions: straight line, no gravity, non-relativistic; flyby concepts do not decelerate.")
    _ = width
    return 0


if __name__ == "__main__":
    sys.exit(main())
