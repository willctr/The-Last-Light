#!/usr/bin/env python3
"""Build public/data/stars-nearby.json: a curated catalogue of bright and nearby stars.

Equatorial J2000 coordinates (RA, Dec) are converted to ecliptic unit vectors so the client can
place each star on the sky sphere in the engine's ecliptic frame. Distances and spectral types
are catalogue values (Hipparcos/Gaia, RECONS); the list is hand-curated, small, and offline.
"""
from __future__ import annotations

import json
import math
import os
import sys
from typing import List, Tuple

import numpy as np

OBLIQUITY_DEG = 23.4392911

# name, RA (h m s), Dec (° ' "), distance (ly), spectral type, apparent V magnitude
STARS: List[Tuple[str, Tuple[float, float, float], Tuple[float, float, float], float, str, float]] = [
    ("Sirius", (6, 45, 8.9), (-16, 42, 58), 8.60, "A1V", -1.46),
    ("Canopus", (6, 23, 57.1), (-52, 41, 44), 310.0, "A9II", -0.74),
    ("Alpha Centauri", (14, 39, 36.5), (-60, 50, 2), 4.37, "G2V", -0.27),
    ("Arcturus", (14, 15, 39.7), (19, 10, 57), 36.7, "K1.5III", -0.05),
    ("Vega", (18, 36, 56.3), (38, 47, 1), 25.0, "A0V", 0.03),
    ("Capella", (5, 16, 41.4), (45, 59, 53), 42.9, "G5III", 0.08),
    ("Rigel", (5, 14, 32.3), (-8, 12, 6), 860.0, "B8Ia", 0.13),
    ("Procyon", (7, 39, 18.1), (5, 13, 30), 11.46, "F5IV", 0.34),
    ("Achernar", (1, 37, 42.8), (-57, 14, 12), 139.0, "B6Vep", 0.46),
    ("Betelgeuse", (5, 55, 10.3), (7, 24, 25), 548.0, "M1Ia", 0.50),
    ("Hadar", (14, 3, 49.4), (-60, 22, 23), 390.0, "B1III", 0.61),
    ("Altair", (19, 50, 47.0), (8, 52, 6), 16.7, "A7V", 0.76),
    ("Acrux", (12, 26, 35.9), (-63, 5, 57), 320.0, "B0.5IV", 0.76),
    ("Aldebaran", (4, 35, 55.2), (16, 30, 33), 65.3, "K5III", 0.86),
    ("Antares", (16, 29, 24.5), (-26, 25, 55), 550.0, "M1.5Iab", 0.96),
    ("Spica", (13, 25, 11.6), (-11, 9, 41), 250.0, "B1III", 0.97),
    ("Pollux", (7, 45, 18.9), (28, 1, 34), 33.8, "K0III", 1.14),
    ("Fomalhaut", (22, 57, 39.0), (-29, 37, 20), 25.1, "A3V", 1.16),
    ("Deneb", (20, 41, 25.9), (45, 16, 49), 2600.0, "A2Ia", 1.25),
    ("Mimosa", (12, 47, 43.3), (-59, 41, 20), 280.0, "B0.5III", 1.25),
    ("Regulus", (10, 8, 22.3), (11, 58, 2), 79.3, "B8IV", 1.40),
    ("Adhara", (6, 58, 37.5), (-28, 58, 19), 430.0, "B2II", 1.50),
    ("Castor", (7, 34, 36.0), (31, 53, 18), 51.0, "A1V", 1.58),
    ("Bellatrix", (5, 25, 7.9), (6, 20, 59), 250.0, "B2III", 1.64),
    ("Alnilam", (5, 36, 12.8), (-1, 12, 7), 2000.0, "B0Ia", 1.69),
    ("Alnitak", (5, 40, 45.5), (-1, 56, 34), 1260.0, "O9.5Iab", 1.77),
    ("Polaris", (2, 31, 49.1), (89, 15, 51), 433.0, "F7Ib", 1.98),
    ("Mintaka", (5, 32, 0.4), (-0, 17, 57), 1200.0, "O9.5II", 2.23),
    ("Proxima Centauri", (14, 29, 42.9), (-62, 40, 46), 4.2465, "M5.5Ve", 11.13),
    ("Barnard's Star", (17, 57, 48.5), (4, 41, 36), 5.96, "M4V", 9.51),
    ("Wolf 359", (10, 56, 29.2), (7, 0, 53), 7.86, "M6V", 13.5),
    ("Lalande 21185", (11, 3, 20.2), (35, 58, 12), 8.31, "M2V", 7.52),
    ("Luyten 726-8", (1, 39, 1.3), (-17, 57, 1), 8.73, "M5.5V", 12.5),
    ("Ross 154", (18, 49, 49.4), (-23, 50, 10), 9.70, "M3.5V", 10.4),
    ("Epsilon Eridani", (3, 32, 55.8), (-9, 27, 30), 10.5, "K2V", 3.73),
    ("Tau Ceti", (1, 44, 4.1), (-15, 56, 15), 11.9, "G8V", 3.50),
    ("61 Cygni", (21, 6, 53.9), (38, 44, 58), 11.4, "K5V", 5.21),
    ("Epsilon Indi", (22, 3, 21.7), (-56, 47, 10), 11.9, "K5V", 4.69),
    ("Gliese 581", (15, 19, 26.8), (-7, 43, 20), 20.5, "M3V", 10.56),
    ("TRAPPIST-1", (23, 6, 29.4), (-5, 2, 29), 40.66, "M8V", 18.8),
    ("Kepler-186", (19, 54, 36.7), (43, 57, 18), 580.0, "M1V", 14.6),
    ("Alpha Centauri B", (14, 39, 35.1), (-60, 50, 14), 4.37, "K1V", 1.33),
]


def hms_to_deg(h: float, m: float, s: float) -> float:
    return 15.0 * (h + m / 60.0 + s / 3600.0)


def dms_to_deg(d: float, m: float, s: float) -> float:
    sign = -1.0 if (d < 0 or (d == 0 and (m < 0 or s < 0))) else 1.0
    return sign * (abs(d) + abs(m) / 60.0 + abs(s) / 3600.0)


def equatorial_to_ecliptic(ra_deg: float, dec_deg: float) -> np.ndarray:
    ra = math.radians(ra_deg)
    dec = math.radians(dec_deg)
    eq = np.array([math.cos(dec) * math.cos(ra), math.cos(dec) * math.sin(ra), math.sin(dec)])
    eps = math.radians(OBLIQUITY_DEG)
    rot = np.array([[1, 0, 0], [0, math.cos(eps), math.sin(eps)], [0, -math.sin(eps), math.cos(eps)]])
    ecl = rot @ eq
    return ecl / np.linalg.norm(ecl)


def build() -> dict:
    stars = []
    for name, ra, dec, dist, sp, mag in STARS:
        ra_deg = hms_to_deg(*ra)
        dec_deg = dms_to_deg(*dec)
        v = equatorial_to_ecliptic(ra_deg, dec_deg)
        stars.append({
            "name": name,
            "raDeg": round(ra_deg, 5),
            "decDeg": round(dec_deg, 5),
            "dir": [round(float(x), 6) for x in v],
            "distanceLy": dist,
            "spectral": sp,
            "mag": mag,
        })
    stars.sort(key=lambda s: s["mag"])
    return {
        "frame": "ecliptic J2000 unit vectors (x toward equinox, z ecliptic north)",
        "sources": ["Hipparcos/Gaia (positions, distances)", "RECONS nearest stars", "SIMBAD spectral types"],
        "count": len(stars),
        "stars": stars,
    }


def main() -> int:
    root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    path = os.path.join(root, "public", "data", "stars-nearby.json")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    data = build()
    with open(path, "w") as f:
        json.dump(data, f, indent=1)
    print(f"wrote {path} ({data['count']} stars)")
    # sanity: Proxima should be roughly opposite the vernal equinox and south of the ecliptic
    prox = next(s for s in data["stars"] if s["name"] == "Proxima Centauri")
    print("Proxima ecliptic dir:", prox["dir"])
    return 0


if __name__ == "__main__":
    sys.exit(main())
