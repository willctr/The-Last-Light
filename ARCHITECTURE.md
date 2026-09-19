# THE LAST LIGHT — Architecture

> A tiny ship. An absurdly large universe.

This document is the technical proposal and the map of the codebase. It is short on purpose;
the code is the reference.

## 1. Stack

| Layer | Technology | Why |
| --- | --- | --- |
| 3D environment | **three.js** (imperative engine, no React reconciler) | Per-frame control over shaders, LOD, floating scale, post-processing. React Three Fiber would add a reconciliation layer between the render loop and physics that this project does not need. |
| Instrument UI | **React 19 + zustand** | Declarative HUD/panels; the engine writes a throttled telemetry snapshot into the store, the UI reads it. |
| Build | **Vite 7 + TypeScript 5 (strict)** | Fast dev loop, ES2022 target, path alias `@/`. |
| Tests | **vitest** + a DevTools-protocol smoke test | Science layer is pure functions and fully unit-testable; Python-generated fixtures cross-check the TS Kepler solver; `scripts/e2e/smoke-course.mjs` drives a real headless Chrome through a full transfer. |
| Scientific tooling | **Python 3.9 + numpy** | Offline validation, dataset generation, tabulation. No backend. |
| Backend | none | The experience is a self-contained client. Nothing here needs a server. |

## 2. Layout

```
src/
  science/     pure TypeScript physics & maths — units, formatting, Kepler, scale mapping, transfer, ephemeris
  data/        the scientific knowledge base: typed catalogue modules (bodies, regions, destinations, propulsion, sources)
  engine/      three.js world: bodies, shaders, star field, belts, ship, camera, input, labels, navigation, loop
  state/       zustand store (telemetry, selection, discoveries, course, UI)
  ui/          React instrument panel: boot, HUD, panels, discovery log, scale ladder
  audio/       procedural WebAudio ambience (no assets)
public/data/   generated JSON (star catalogue)
scripts/       Python tooling (astronomy/, data/, simulation/)
```

Dependency direction: `ui → state → (science, data)`, `engine → (science, data, state)`. `science` and
`data` depend on nothing else. The engine never imports React; the UI never imports three.js.

## 3. Visual space vs scientific space

Everything the player *sees* lives in compressed visual space; everything the player *reads* is
computed in real units. The mapping (`src/science/scale.ts`) is hierarchical and radial, so orbits
stay closed curves and ordering is preserved:

- heliocentric distance: `r_vis = 100 · r_AU^0.56` (Earth at 100 units, Neptune ≈ 672, heliopause ≈ 1,460)
- body radius: `R_vis = 0.0194 · R_km^0.45` (Earth ≈ 1.0, Jupiter ≈ 2.9, Sun ≈ 8.3)
- moon orbits: `d_vis = R_parent_vis · (d / R_parent)^0.8`

`Ephemeris.resolveFrame` inverts the mapping for the ship: it finds the body whose local frame the
ship is inside (normalised distance), inverts that frame, and blends to the heliocentric inverse near
the edge so readouts stay continuous. Every HUD distance, velocity and light-time comes from this.

## 4. Two kinds of motion

- **Manual flight** moves the ship through the visual representation. It is for looking around.
  The HUD labels it `MANUAL · VISUAL NAV` and shows no physical velocity for it.
- **SET COURSE** is a physical transfer (`src/science/transfer.ts`): straight-line
  brachistochrone / Δv-limited coast / cruise flyby with the installed drive. Because the destination
  moves during transit (Mars travels ~200° in a 386-day NEP trip), the planner solves a fixed point:
  travel time to the target's position *at arrival* (`solveTransfer` in `engine/nav/Navigation.ts`).
  It yields real distance, Δv, peak velocity, travel time and arrival date, with its assumptions
  listed — including a warning when the straight chord passes close to the Sun. On ENGAGE the visual
  flight plays out over 6–17 real seconds while the mission clock advances the full travel time, so
  the planets move to where they will actually be at arrival. Travel time is therefore a mechanic,
  not a caption.

Simulation time (`simTime`, seconds since J2000) is separate from real time. The player chooses
×1 … ×1,000,000; a course sets an automatic multiplier that the time control displays.

**Known limitation.** The transfer is a straight chord in space. For long, slow transfers the
destination can end up on the far side of the Sun, and the chord then passes close to it (Earth →
Europa with the baseline drive comes within ~0.05 AU). The plan says so in its assumptions, and the
readouts stay honest, but a real mission would fly an orbital transfer. A Lambert/Hohmann planner
that respects the Sun's gravity is the next step for this system.

## 5. Orbital mechanics

Planets use JPL/Standish mean elements with secular rates (valid 1800–2050), solved with Newton's
method on Kepler's equation. Moons and dwarf planets use fixed classical elements with a period;
their orbital *phase* is approximate (not an ephemeris) and the dossier says so. Moon orbit planes
are tilted by the parent's obliquity about the ecliptic x-axis — a simplification.

## 6. Epistemic discipline

Every fact carries an `EpistemicStatus`; the UI renders it as a coloured tag with text (green
established / blue plausible / purple speculative). Habitability is an eleven-factor matrix with
`CONFIRMED … NOT_DETECTED` values, never a score. Propulsion concepts carry
`DEMONSTRATED / PROPOSED / THEORETICAL / SPECULATIVE`. Sources are stored as metadata and shown in
the dossier; text is paraphrased, never copied.

## 7. Rendering

- One procedural planet shader (`shaders/planet.glsl.ts`) with nine surface families driven by
  uniforms; no textures are loaded. Sun, atmosphere shells, rings, belts, galaxy band and heliopause
  have their own small shaders.
- Logarithmic depth buffer (custom shaders include the log-depth chunks) so a 0.14-unit ship and a
  60,000-unit Oort shell coexist.
- Post: UnrealBloom → vignette/grain → OutputPass (ACES).
- LOD: moons hidden beyond ~7× their parent's influence radius; labels hidden when a body fills the
  view; adaptive pixel-ratio cap when frame time exceeds ~28 ms.

## 8. Milestones

1. **Solar System vertical slice** (this build): boot → Earth orbit → select/scan/learn/course → planets,
   moons, dwarf planets, belts, heliopause crossing, discovery log, scale ladder, nav database,
   propulsion catalogue.
2. Interstellar tier: scale-tier transition beyond the heliopause; nearby stars as destinations;
   red dwarf and blue giant encounters; exoplanet catalogue (Python preprocessing of the NASA
   Exoplanet Archive → JSON).
3. Extreme objects: black hole (lensing shader, horizon state), pulsar, supernova.
4. Speculative gallery: wormhole (clearly labelled), entanglement demo.
5. Galactic and cosmological tiers; the observable-universe ending.
