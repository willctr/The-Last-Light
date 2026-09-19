import type { PropulsionProfile } from '@/science/transfer';

/**
 * Propulsion concept catalogue. Performance numbers are representative, not mission-specific.
 * Status distinguishes what has flown, what has been ground-tested or seriously designed,
 * what is consistent with physics but unbuilt, and what requires unknown physics.
 */
export const PROPULSION_PROFILES: PropulsionProfile[] = [
  {
    id: 'chemical',
    name: 'CHEMICAL PROPULSION',
    status: 'DEMONSTRATED',
    accelerationMs2: 10,
    deltaVBudgetKms: 12,
    decelerates: true,
    summary: 'Burning propellant and oxidiser. Every mission that has ever launched used it.',
    performance: 'Exhaust velocity ~3–4.5 km/s; high thrust for minutes. Practical Δv ~10–15 km/s for a departure stage.',
    energy: 'Chemical bond energy; limited by propellant mass (rocket equation).',
    limitations: 'Interplanetary trips take months to years via coasting transfers; interstellar travel is out of reach by many orders of magnitude.',
    examples: 'Saturn V, Falcon 9, Voyager (launch), every crewed spacecraft to date.',
    sourceIds: ['nasa-science'],
  },
  {
    id: 'nuclear-thermal',
    name: 'NUCLEAR THERMAL PROPULSION',
    status: 'PROPOSED',
    accelerationMs2: 3,
    deltaVBudgetKms: 22,
    decelerates: true,
    summary: 'A fission reactor heats hydrogen propellant and expels it. Ground-tested in the 1960s–70s (NERVA); never flown.',
    performance: 'Exhaust velocity ~8–9 km/s (roughly twice chemical); high thrust.',
    energy: 'Nuclear fission; propellant still needed as reaction mass.',
    limitations: 'Reactor mass, hydrogen storage, and safety; cuts Mars transit times but does not change the interstellar picture.',
    examples: 'NERVA (ground tests), DRACO demonstrator programme (announced 2023).',
    sourceIds: ['nerva', 'nasem-2021'],
  },
  {
    id: 'nuclear-electric',
    name: 'NUCLEAR ELECTRIC PROPULSION',
    status: 'PROPOSED',
    accelerationMs2: 1e-3,
    deltaVBudgetKms: 240,
    decelerates: true,
    summary:
      'A fission reactor powers electric thrusters that accelerate ions to tens of km/s. Electric thrusters have flown on solar power (Dawn, BepiColombo); megawatt-class nuclear versions are proposed. AURORA-01’s baseline drive assumes such a system.',
    performance: 'Exhaust velocity 30–100 km/s; thrust tiny (milli-g or less) but sustained for years. AURORA-01 assumption: 1 × 10⁻³ m/s² (~0.0001 g), Δv budget 240 km/s.',
    energy: 'Megawatt-class fission reactor; large radiators to reject waste heat.',
    limitations: 'Reactor and radiator mass; very low thrust means slow departures; even 100+ km/s makes the nearest star a 10,000-year voyage.',
    examples: 'Dawn (solar-electric, demonstrated); JIMO (cancelled); NASEM 2021 study.',
    sourceIds: ['nasem-2021', 'nasa-dawn'],
  },
  {
    id: 'solar-sail',
    name: 'SOLAR SAIL',
    status: 'DEMONSTRATED',
    accelerationMs2: 5e-5,
    deltaVBudgetKms: 60,
    decelerates: false,
    summary: 'A large reflective sail pushed by sunlight itself. No propellant. Demonstrated in orbit by IKAROS (2010) and LightSail 2 (2019).',
    performance: 'Acceleration ~0.05–0.5 mm/s² at 1 AU for current designs; falls off with the square of distance from the Sun.',
    energy: 'Solar radiation pressure.',
    limitations: 'Useless far from the Sun; cannot easily decelerate; large, fragile structures.',
    examples: 'IKAROS (JAXA), LightSail 2 (Planetary Society), NEA Scout.',
    sourceIds: ['tsuda-2011', 'lightsail-2'],
  },
  {
    id: 'fusion',
    name: 'FUSION CONCEPT',
    status: 'THEORETICAL',
    accelerationMs2: 0.25,
    deltaVBudgetKms: 36_000,
    decelerates: false,
    summary: 'Fusing deuterium and helium-3 to expel plasma. Consistent with physics; no fusion rocket has been built, and controlled fusion power itself is not yet practical.',
    performance: 'Project Daedalus (1978 design study): 0.12 c flyby of Barnard’s Star in ~50 years using 50,000 tonnes of fuel.',
    energy: 'Nuclear fusion; helium-3 mining from gas giants proposed for fuel.',
    limitations: 'Engineering unproven at any scale; enormous fuel mass; flyby only unless Δv is doubled for deceleration.',
    examples: 'Project Daedalus (BIS), Direct Fusion Drive (concept).',
    sourceIds: ['daedalus-1978'],
  },
  {
    id: 'laser-sail',
    name: 'LASER-DRIVEN SAIL CONCEPT',
    status: 'PROPOSED',
    accelerationMs2: 0,
    deltaVBudgetKms: Infinity,
    cruiseFractionOfC: 0.2,
    decelerates: false,
    summary: 'Ground-based lasers push a gram-scale sail to a fifth of light speed in minutes. Breakthrough Starshot proposes flyby probes to Alpha Centauri within a human lifetime.',
    performance: '0.2 c cruise for a gram-scale probe; Proxima Centauri in ~21 years plus 4.2 years for the signal home.',
    energy: '~100 GW laser array for minutes; no on-board propellant.',
    limitations: 'Flyby only — no way to stop; probe is grams, not a crewed ship; laser array not built; dust impacts at 0.2 c.',
    examples: 'Breakthrough Starshot (2016–), Lubin “Roadmap to Interstellar Flight”.',
    sourceIds: ['starshot', 'lubin-2016'],
  },
  {
    id: 'antimatter',
    name: 'ANTIMATTER CONCEPT',
    status: 'SPECULATIVE',
    accelerationMs2: 1,
    deltaVBudgetKms: 120_000,
    decelerates: true,
    summary: 'Matter–antimatter annihilation converts mass entirely to energy. Physics is well understood; production and storage are not remotely practical.',
    performance: 'In principle a few tenths of c with deceleration; the numbers here are illustrative only.',
    energy: 'Humanity has produced nanograms of antimatter; a starship would need tonnes.',
    limitations: 'Antimatter production is ~10¹⁶ times too slow and expensive; storage and gamma-ray shielding unsolved.',
    examples: 'Concept studies only.',
    sourceIds: ['nasa-science'],
  },
];

export const PROPULSION_BY_ID: Record<string, PropulsionProfile> = Object.fromEntries(PROPULSION_PROFILES.map((p) => [p.id, p]));

/** The drive AURORA-01 carries at the start. */
export const AURORA_DEFAULT_PROPULSION_ID = 'nuclear-electric';
/** Δv AURORA-01 carries at the start (km/s) — equals the baseline drive's budget. */
export const AURORA_DELTA_V_KMS = 240;
