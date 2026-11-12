import { extractNumbers, splitSurpassing, toTemplate } from './stats.ts';
import type { EffectDiff } from './types.ts';

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
/** Lowercases only the first letter, so names inside the text keep their capitals. */
export const lcFirst = (s: string): string => s.charAt(0).toLowerCase() + s.slice(1);

export function prettyTemplate(t: string): string {
  return t.replace(/#/g, 'X');
}

/**
 * Effect name for display. The headline number becomes X, and so does any number that
 * differs between nodes; numbers every node shares stay as they are, e.g. the "Tier 16" in
 * "X% chance for a Strongbox in your Tier 16 Maps to be replaced with…".
 */
export function effectTitle(template: string, texts: string[]): string {
  const parts = template.split('#');
  const slots = parts.length - 1;
  const values = texts.map(extractNumbers);
  if (!slots || !values.length || values.some((v) => v.length !== slots)) return prettyTemplate(template);
  // Same rule as mainValue(): the first number followed by '%', otherwise the first number.
  const pctSlot = parts.findIndex((p, i) => i > 0 && p.startsWith('%'));
  const main = pctSlot > 0 ? pctSlot - 1 : 0;
  const shared = parts.slice(1).map((_, i) => i !== main && values.every((vs) => vs[i] === values[0][i]));
  // A range ("1-15", "1 to 3") is shown whole or not at all.
  for (let i = 0; i + 1 < slots; i++) {
    if (/^\s*(-|to)\s*$/.test(parts[i + 1]) && !(shared[i] && shared[i + 1])) shared[i] = shared[i + 1] = false;
  }
  let out = parts[0];
  for (let i = 0; i < slots; i++) out += (shared[i] ? String(values[0][i]) : 'X') + parts[i + 1];
  return out;
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

/** Stat texts of every node line behind an effect, from both trees (only lines that share its template). */
export function effectTexts(e: EffectDiff): string[] {
  return [...(e.old?.contributions ?? []), ...(e.new?.contributions ?? [])].map((c) => c.text).filter((t) => toTemplate(t) === e.label);
}
