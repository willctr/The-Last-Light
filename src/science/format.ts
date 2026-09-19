/**
 * Human-readable formatting of scientific quantities for the spacecraft instrumentation.
 * Every formatter takes SI-ish internal units (km, seconds, kg, K, km/s) and chooses an
 * appropriate display unit. Nothing here rounds the underlying data.
 */
import {
  AU_KM,
  C_KMS,
  EARTH_MASS_KG,
  EARTH_RADIUS_KM,
  JUPITER_MASS_KG,
  LIGHT_YEAR_KM,
  PARSEC_KM,
  SECONDS_PER_DAY,
  SECONDS_PER_HOUR,
  SECONDS_PER_JULIAN_YEAR,
  SECONDS_PER_MINUTE,
  SOLAR_MASS_KG,
  SOLAR_RADIUS_KM,
  kelvinToCelsius,
} from './units';

const groupFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

export function formatGrouped(value: number, maxFractionDigits = 0): string {
  if (!Number.isFinite(value)) return '—';
  if (maxFractionDigits === 0) return groupFormatter.format(Math.round(value));
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: maxFractionDigits }).format(value);
}

/** Significant-figure formatting without scientific notation for moderate magnitudes. */
export function formatSig(value: number, sig = 3): string {
  if (!Number.isFinite(value)) return '—';
  if (value === 0) return '0';
  const abs = Math.abs(value);
  if (abs >= 1e6 || abs < 1e-4) return value.toExponential(sig - 1).replace('e+', 'e');
  const digits = Math.max(0, sig - Math.floor(Math.log10(abs)) - 1);
  return formatGrouped(value, digits);
}

/** Distance formatter: picks km, AU, ly or pc based on magnitude. */
export function formatDistance(km: number): string {
  if (!Number.isFinite(km)) return '—';
  const abs = Math.abs(km);
  if (abs < 1) return `${formatSig(km, 3)} km`;
  if (abs < 20_000_000) return `${formatGrouped(km)} km`;
  if (abs < 0.05 * LIGHT_YEAR_KM) {
    const au = km / AU_KM;
    return `${formatSig(au, au >= 100 ? 4 : 4)} AU`;
  }
  if (abs < 1000 * LIGHT_YEAR_KM) return `${formatSig(km / LIGHT_YEAR_KM, 4)} ly`;
  return `${formatSig(km / PARSEC_KM, 4)} pc`;
}

/** Distance with an explicit secondary unit, e.g. "4.2465 ly (268,800 AU)". */
export function formatDistanceDual(km: number): string {
  const primary = formatDistance(km);
  const abs = Math.abs(km);
  if (abs >= 0.05 * LIGHT_YEAR_KM) return `${primary} (${formatGrouped(km / AU_KM)} AU)`;
  if (abs >= 20_000_000) return `${primary} (${formatGrouped(km)} km)`;
  return primary;
}

export function formatAU(km: number, sig = 4): string {
  return `${formatSig(km / AU_KM, sig)} AU`;
}

export function formatLightYears(km: number, sig = 4): string {
  return `${formatSig(km / LIGHT_YEAR_KM, sig)} ly`;
}

/** Velocity formatter: km/s and fraction of c. */
export function formatVelocity(kms: number): { kms: string; c: string } {
  if (!Number.isFinite(kms)) return { kms: '—', c: '—' };
  const abs = Math.abs(kms);
  const kmsText = abs < 1 ? `${formatSig(kms * 1000, 3)} m/s` : `${formatSig(kms, abs >= 1000 ? 4 : 4)} km/s`;
  const frac = kms / C_KMS;
  return { kms: kmsText, c: `${formatFractionOfC(frac)} c` };
}

export function formatFractionOfC(frac: number): string {
  if (!Number.isFinite(frac)) return '—';
  if (frac === 0) return '0';
  const abs = Math.abs(frac);
  if (abs >= 0.01) return frac.toFixed(3);
  if (abs >= 1e-4) return frac.toFixed(5);
  return frac.toExponential(2).replace('e-', 'e−');
}

/** Duration formatter: seconds → adaptive string. */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds)) return '—';
  const s = Math.abs(seconds);
  if (s < SECONDS_PER_MINUTE) return `${s.toFixed(s < 10 ? 1 : 0)} s`;
  if (s < SECONDS_PER_HOUR) return `${Math.floor(s / 60)} min ${Math.round(s % 60)} s`;
  if (s < SECONDS_PER_DAY) return `${Math.floor(s / 3600)} h ${Math.round((s % 3600) / 60)} min`;
  if (s < 90 * SECONDS_PER_DAY) return `${Math.floor(s / SECONDS_PER_DAY)} d ${Math.round((s % SECONDS_PER_DAY) / 3600)} h`;
  const years = s / SECONDS_PER_JULIAN_YEAR;
  if (years < 2) return `${(s / SECONDS_PER_DAY).toFixed(0)} days`;
  if (years < 1000) return `${years.toFixed(years < 10 ? 1 : 0)} years`;
  if (years < 1e6) return `${formatGrouped(years)} years`;
  if (years < 1e9) return `${formatSig(years / 1e6, 3)} million years`;
  return `${formatSig(years / 1e9, 3)} billion years`;
}

/** Mission clock: DDDD:HH:MM. */
export function formatMissionClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const days = Math.floor(s / SECONDS_PER_DAY);
  const hours = Math.floor((s % SECONDS_PER_DAY) / SECONDS_PER_HOUR);
  const minutes = Math.floor((s % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE);
  return `${String(days).padStart(4, '0')}:${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function formatMass(kg: number): string {
  if (!Number.isFinite(kg)) return 'UNKNOWN';
  if (kg >= 0.05 * SOLAR_MASS_KG) return `${formatSig(kg / SOLAR_MASS_KG, 3)} M☉`;
  if (kg >= 0.05 * JUPITER_MASS_KG) return `${formatSig(kg / JUPITER_MASS_KG, 3)} M♃`;
  if (kg >= 1e-3 * EARTH_MASS_KG) return `${formatSig(kg / EARTH_MASS_KG, 3)} M⊕`;
  return `${kg.toExponential(2).replace('e+', '×10^')} kg`;
}

export function formatRadius(km: number): string {
  if (!Number.isFinite(km)) return 'UNKNOWN';
  if (km >= 0.1 * SOLAR_RADIUS_KM) return `${formatGrouped(km)} km (${formatSig(km / SOLAR_RADIUS_KM, 3)} R☉)`;
  if (km >= 1000) return `${formatGrouped(km)} km (${formatSig(km / EARTH_RADIUS_KM, 3)} R⊕)`;
  return `${formatSig(km, 3)} km`;
}

export function formatTemperature(k: number): string {
  if (!Number.isFinite(k)) return 'UNKNOWN';
  const c = kelvinToCelsius(k);
  return `${formatGrouped(k)} K (${c > 0 ? '+' : ''}${formatGrouped(c)} °C)`;
}

export function formatTimeScale(scale: number): string {
  if (scale === 0) return 'PAUSED';
  if (scale < 1000) return `×${formatGrouped(scale)}`;
  return `×${formatGrouped(scale)}`;
}

export function formatDateUTC(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  const hh = String(date.getUTCHours()).padStart(2, '0');
  const mm = String(date.getUTCMinutes()).padStart(2, '0');
  return `${y}-${m}-${d} ${hh}:${mm} UTC`;
}

export function formatPercent(fraction: number, digits = 0): string {
  return `${(fraction * 100).toFixed(digits)}%`;
}

export function formatAccelerationG(ms2: number): string {
  const g = ms2 / 9.80665;
  if (g === 0) return '0 g';
  if (g < 0.001) return `${g.toExponential(1).replace('e-', 'e−')} g`;
  return `${formatSig(g, 2)} g`;
}
