# THE LAST LIGHT — working notes for Claude Code

Interactive scientific visualization (three.js + React + TypeScript, Python tooling). Read
`ARCHITECTURE.md` first.

## Commands
- `npm run dev` — Vite dev server
- `npm run typecheck` / `npm run build` / `npm test`
- `python3 scripts/astronomy/kepler.py --write-fixtures` after touching Kepler code or planet elements
- `python3 scripts/data/build_star_catalog.py` after editing the star list

## Conventions
- Science layer (`src/science`) is pure TS with no three.js or React imports; keep it unit-tested.
- Scientific content lives in `src/data/**` as typed modules. Every `Fact` needs an `EpistemicStatus`;
  every propulsion concept a `PropulsionStatus`. Never present speculation as observation; say UNKNOWN
  when a property is unknown.
- Visual units are never shown to the user as distances. Readouts use real km/AU/ly via `formatDistance`.
- Ecliptic → three.js frame is `(x, y, z) → (x, z, −y)`; use `eclToThree` / `threeToEcl`.
- Custom shaders must include the three log-depth chunks (`logdepthbuf_*`) because the renderer uses a
  logarithmic depth buffer.
- No external assets: surfaces, stars, ship and audio are procedural. Keep it that way unless a
  dataset genuinely earns its bytes.
- UI colour language: cyan primary, amber secondary, red sparingly; green/blue/purple only for
  epistemic tiers, always with a text label.
