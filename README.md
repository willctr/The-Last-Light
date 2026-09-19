# THE LAST LIGHT

*A tiny ship. An absurdly large universe.*

An interactive scientific visualization: you pilot the exploration vessel **AURORA-01** through the
Solar System — and, in later milestones, beyond it. No weapons, no enemies. The universe is the
challenge, and its scale is the story.

## Run it

```
npm install
npm run dev        # http://localhost:5173
```

Other commands:

```
npm run build      # typecheck + production build → dist/
npm test           # science-layer unit tests (vitest)
npm run test:e2e   # real-time smoke test of a full course (needs a local Chrome and `vite preview` on :4173)
npm run data:stars     # regenerate public/data/stars-nearby.json (Python)
npm run data:fixtures  # regenerate Kepler cross-check fixtures (Python)
npm run science:travel # print a travel-time table (Python)
```

Python tooling needs Python 3.9+ and numpy (`pip install -r scripts/requirements.txt`).

## Controls

Drag to look, wheel to zoom, **W/S/A/D/R/F** to fly (visual navigation), click an object or its
label to select it. **T** plans a physical course, **Enter** engages it, **C** scans, **E** opens the
science dossier. **[ ]** change time acceleration, **Space** pauses. **H** shows everything else.

Deep link: `?course=<objectId>` (for example `?course=europa`) plans and engages a course as soon as
the boot sequence ends — handy for demos and for the smoke test.

## What is real and what is not

- Planet positions come from JPL mean orbital elements and are correct for the simulation date.
- Moon orbital *phases* are approximate. Surfaces are procedural, not photographic.
- Distances shown on instruments are real. The visual scene is compressed so that it can be
  navigated; the app says so wherever it matters.
- Every scientific statement carries an epistemic status, and no propulsion concept is presented
  as more real than it is.

See [ARCHITECTURE.md](ARCHITECTURE.md) for the technical design.
