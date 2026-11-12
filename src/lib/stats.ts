import type { StatLine } from './types.ts';

// A sign only counts when it is not part of a range like "Tier 1-15".
const NUMBER_RE = /(?<![\w.])[+-]?\d+(?:\.\d+)?|\d+(?:\.\d+)?/g;

/**
 * Removes GGG's tooltip markup and normalizes whitespace.
 *   "[ContainsAbyss|Abysses] in your Maps" -> "Abysses in your Maps"
 *   "[Onslaught]"                         -> "Onslaught"
 */
export function cleanStat(raw: string): string {
  return raw
    .replace(/\[([^\]|]+)\|([^\]]+)\]/g, '$2')
    .replace(/\[([^\]]+)\]/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Replaces every number with '#' so the same effect matches across versions. */
export function toTemplate(text: string): string {
  return text.replace(NUMBER_RE, '#');
}

export function extractNumbers(text: string): number[] {
  return (text.match(NUMBER_RE) ?? []).map(Number);
}

/**
 * The number that represents the line's power: the first number directly followed
 * by '%' (skips things like "Tier 1-15 Maps"), otherwise the first number.
 */
export function mainValue(text: string): number | null {
  const pct = /([+-]?\d+(?:\.\d+)?)%/.exec(text);
  if (pct) return Number(pct[1]);
  const nums = extractNumbers(text);
  return nums.length ? nums[0] : null;
}

export function parseStat(raw: string): StatLine {
  const text = cleanStat(raw);
  return {
    text,
    template: toTemplate(text),
    values: extractNumbers(text),
    main: mainValue(text),
    surpassing: /Surpassing Chance/i.test(text),
  };
}

/**
 * Surpassing Chance: every full 100% is one guaranteed instance, the remainder is the
 * chance for one more. 610% -> { guaranteed: 6, extraChance: 10 }.
 */
export function splitSurpassing(totalPct: number): { guaranteed: number; extraChance: number } {
  const guaranteed = Math.floor(totalPct / 100 + 1e-9);
  const extraChance = Math.round((totalPct - guaranteed * 100) * 100) / 100;
  return { guaranteed, extraChance };
}

/** Lower-case word tokens, for similarity scoring. */
export function tokens(text: string): Set<string> {
  const stop = new Set(['in', 'your', 'maps', 'map', 'the', 'a', 'an', 'to', 'of', 'have', 'has', 'be', 'by', 'for', 'and', 'is', 'are', '#', 'with', 'on', 'that', 'can', 'which', 'from']);
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z#' ]+/g, ' ')
      .split(' ')
      .filter((t) => t && !stop.has(t)),
  );
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size && !b.size) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

export function round(n: number, digits = 2): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}
