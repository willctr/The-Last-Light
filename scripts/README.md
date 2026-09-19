# Python scientific tooling

Offline utilities that generate browser assets and cross-check the TypeScript science layer.
Python is used only where it is genuinely useful: numerical validation, dataset generation,
and tabulation. Anything that must be responsive in the browser lives in `src/science/`.

```
scripts/
  astronomy/kepler.py        Keplerian propagation with numpy; writes test fixtures for the TS implementation
  astronomy/travel_time.py   Travel-time tables for every propulsion concept and destination
  data/build_star_catalog.py Curated bright/nearby star catalogue → public/data/stars-nearby.json
  simulation/                (reserved for future n-body / stellar-evolution tooling)
  e2e/smoke-course.mjs       Node + DevTools-protocol smoke test: boots the app, engages a course, watches it complete
```

Run from the repository root:

```
python3 scripts/astronomy/kepler.py --write-fixtures   # → src/science/__fixtures__/kepler.json
python3 scripts/astronomy/travel_time.py               # prints a table
python3 scripts/data/build_star_catalog.py             # → public/data/stars-nearby.json
```

Only numpy is required (`pip install -r scripts/requirements.txt`).
