import { splitSurpassing } from './stats.ts';

export function trimNum(n: number, digits = 2): string {
  if (!Number.isFinite(n)) return '–';
  const f = 10 ** digits;
  return String(Math.round(n * f) / f);
}

export function pct(ratio: number | null | undefined, digits = 0): string {
  if (ratio == null) return '–';
  return `${trimNum(ratio * 100, digits)}%`;
}

/** 610 (% Surpassing Chance) -> "6 + 10%" */
export function surpass(totalPct: number): string {
  const { guaranteed, extraChance } = splitSurpassing(totalPct);
  if (!extraChance) return `${guaranteed}`;
  if (!guaranteed) return `${trimNum(extraChance)}% for 1`;
  return `${guaranteed} + ${trimNum(extraChance)}%`;
}

/** Formats an effect total. Counts derived from Surpassing Chance show guaranteed + extra chance. */
export function fmtValue(value: number, unit: string, surpassing = false): string {
  if (unit === 'binary' || unit === 'content') return value > 0 ? 'yes' : 'no';
  if (unit.startsWith('count')) {
    const base = trimNum(value);
    return surpassing ? `${base} (${surpass(value * 100)})` : base;
  }
  if (unit.startsWith('%')) return `${trimNum(value)}${unit}`;
  return `${trimNum(value)} ${unit}`;
}

export function signedPct(n: number | null): string {
  if (n == null) return '';
  return `${n > 0 ? '+' : ''}${trimNum(n, 1)}%`;
}

/** Renders a '#' template with values for display: "Your Maps have #% ..." */
export function prettyTemplate(t: string): string {
  return t.replace(/#/g, 'X');
}

const MAIN_PCT = /([+-]?)(\d+(?:\.\d+)?)%/;
const FIRST_NUM = /([+-]?)(\d+(?:\.\d+)?)/;

/**
 * Rewrites a stat line with a different headline value, e.g. a stacked total:
 * withValue('Your Maps have +25% Surpassing Chance…', 500) -> 'Your Maps have +500% Surpassing Chance…'
 */
export function withValue(text: string, value: number): string {
  const re = MAIN_PCT.test(text) ? MAIN_PCT : FIRST_NUM;
  return text.replace(re, (_m, sign: string, _n: string) => `${sign}${trimNum(value)}${re === MAIN_PCT ? '%' : ''}`);
}

/** Formats `value` like the headline number of `text` ("+500%", "30%", "4"). */
export function likeText(text: string, value: number): string {
  const m = MAIN_PCT.exec(text);
  if (m) return `${m[1]}${trimNum(value)}%`;
  const n = FIRST_NUM.exec(text);
  return `${n?.[1] ?? ''}${trimNum(value)}`;
}

/** 560 -> "5 guaranteed + 60% chance for a 6th" (Surpassing Chance). */
export function surpassLong(totalPct: number): string {
  const { guaranteed, extraChance } = splitSurpassing(totalPct);
  if (!extraChance) return `${guaranteed} guaranteed`;
  return `${guaranteed} guaranteed + ${trimNum(extraChance)}% chance for a ${ordinal(guaranteed + 1)}`;
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
