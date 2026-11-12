import { describe, expect, it } from 'vitest';
import { cleanStat, parseStat, splitSurpassing, toTemplate } from '../src/lib/stats.ts';
import { effectTitle, likeText, surpassLong, withValue } from '../src/lib/format.ts';
import { resemblance } from '../src/lib/resemblance.ts';
import { evaluateEffect, overallFate, sumMatches } from '../src/lib/scarabs.ts';
import { compareNotables } from '../src/lib/diff.ts';
import { effectForCount, layerOf, verdictFor } from '../src/lib/strategy.ts';
import { categoryOf, compareMechanics, matchesMechanic } from '../src/lib/mechanics.ts';
import type { TreeNode } from '../src/lib/types.ts';

function node(id: string, name: string, stats: string[], opts: Partial<TreeNode> = {}): TreeNode {
  return { id, name, icon: '', kind: 'small', mechanic: 'Test', stats: stats.map(parseStat), x: 0, y: 0, out: [], ...opts };
}

describe('stat parsing', () => {
  it('strips GGG tooltip markup', () => {
    expect(cleanStat('[ContainsAbyss|Abysses] in your Maps have 15% [SurpassChance|Surpassing Chance]')).toBe(
      'Abysses in your Maps have 15% Surpassing Chance',
    );
    expect(cleanStat('Red Beasts have [Onslaught]')).toBe('Red Beasts have Onslaught');
  });

  it('templates numbers but keeps ranges intact', () => {
    expect(toTemplate('Tier 1-15 Maps found have 5% chance')).toBe('Tier #-# Maps found have #% chance');
    expect(toTemplate('Your Maps have +25% Surpassing Chance')).toBe('Your Maps have #% Surpassing Chance');
  });

  it('uses the first percentage as the main value', () => {
    expect(parseStat('Tier 1-15 Maps found have 5% chance to become 1 tier higher').main).toBe(5);
    expect(parseStat('Your Maps contain 4 additional Packs').main).toBe(4);
    expect(parseStat('Your Maps have +25% [SurpassChance|Surpassing Chance] to contain a Shrine').surpassing).toBe(true);
  });
});

describe('Surpassing Chance (every 100% = +1)', () => {
  it('splits into guaranteed + chance for one more', () => {
    expect(splitSurpassing(610)).toEqual({ guaranteed: 6, extraChance: 10 });
    expect(splitSurpassing(500)).toEqual({ guaranteed: 5, extraChance: 0 });
    expect(splitSurpassing(60)).toEqual({ guaranteed: 0, extraChance: 60 });
  });

  it('converts Surpassing Chance lines to counts and takes only the best variant of a choice node', () => {
    const nodes = [
      node('1', 'Essence Chance', ['Your Maps have +25% Surpassing Chance to contain an Imprisoned Monster']),
      node('2', 'Essence Chance', ['Your Maps have +25% Surpassing Chance to contain an Imprisoned Monster']),
      node('3', 'Prolific Essence', ['Your Maps have +60% Surpassing Chance to contain an Imprisoned Monster'], { kind: 'notable' }),
      node('4', 'Blended Realities', [], {
        kind: 'notable',
        variants: [
          [parseStat('Your Maps have +50% Surpassing Chance to contain an Imprisoned Monster')],
          [parseStat('Your Maps have +50% Surpassing Chance to contain a Shrine')],
        ],
      }),
    ];
    const r = sumMatches(nodes, [{ text: 'Surpassing Chance to contain an Imprisoned Monster' }], 'count');
    expect(r.total).toBeCloseTo(1.6); // 0.25 + 0.25 + 0.6 + 0.5 (one variant)
    expect(r.contributions.filter((c) => c.choice)).toHaveLength(1);
  });
});

describe('scarab effect evaluation', () => {
  const oldNodes = [node('a', 'Old', ['Your Maps have a 5% chance to contain an additional Imprisoned Monster'])];
  const newNodes = [node('b', 'New', ['Your Maps have +60% Surpassing Chance to contain an Imprisoned Monster'])];

  it('multiplies by limit for max power and compares best cases', () => {
    const r = evaluateEffect(
      {
        label: 'Imprisoned Monsters',
        scarab: 3,
        unit: 'count',
        tree329: [{ text: 'chance to contain an additional Imprisoned Monster', scale: 0.01 }],
        tree330: [{ text: 'Surpassing Chance to contain an Imprisoned Monster' }],
      },
      5,
      oldNodes,
      newNodes,
    );
    expect(r.scarabMax).toBe(15);
    expect(r.before).toBeCloseTo(15.05);
    expect(r.after).toBeCloseTo(0.6);
    expect(r.fate).toBe('reduced');
    expect(r.absorbed).toBeCloseTo((0.6 - 0.05) / 15);
  });

  it('respects caps (a 100% chance cannot get better)', () => {
    const merc = (v: number) => node('m' + v, 'Merc', [`Your Maps have +${v}% chance to be inhabited by a Mercenary`]);
    const r = evaluateEffect(
      { label: 'Mercenary', scarab: 100, unit: '%', stacks: false, cap: 100, tree329: [{ text: 'inhabited by a Mercenary' }], tree330: [{ text: 'inhabited by a Mercenary' }] },
      1,
      [merc(110)],
      [merc(150)],
    );
    expect(r.before).toBe(100);
    expect(r.after).toBe(100);
    expect(r.fate).toBe('full');
  });

  it('marks an effect removed when the 3.30 tree adds nothing new', () => {
    const same = [node('x', 'Pack', ['Monster Packs Influenced by The Searing Exarch in your Maps have 40% increased Pack Size'])];
    const r = evaluateEffect(
      { label: 'Hordes', scarab: 40, unit: '%', tree329: [{ text: 'Searing Exarch in your Maps have' }], tree330: [{ text: 'Searing Exarch in your Maps have' }] },
      1,
      same,
      same,
    );
    expect(r.retention).toBe(0.5);
    expect(r.fate).toBe('removed');
  });

  it('keeps forced fates and derives the scarab fate from the primary effect', () => {
    const r = evaluateEffect({ label: 'Abyss', scarab: 1, unit: 'content', fate: 'thread' }, 5, [], []);
    expect(r.fate).toBe('thread');
    expect(r.retention).toBeNull();
    expect(overallFate([r, { ...r, fate: 'removed' }])).toBe('thread');
  });
});

describe('notable comparison', () => {
  it('pairs lines whose wording changed slightly and compares their numbers', () => {
    const o = node('o', 'Amplified Artefacts', ['Rare Monsters in your Maps have 50% increased chance to drop Scarabs per Monster Modifier affecting them'], { kind: 'notable' });
    const n = node('n', 'Amplified Artefacts', ['Rare Monsters in your Maps have 50% increased chance to drop [Thread|Threads] per Monster Modifier affecting them'], { kind: 'notable' });
    expect(compareNotables(o, n).status).toBe('unchanged');
  });

  it('treats a bigger downside as a nerf', () => {
    const o = node('o', 'K', ['Hive Monsters in your Maps have 4% increased Toughness per Flammable Burrow destroyed'], { kind: 'notable' });
    const n = node('n', 'K', ['Hive Monsters in your Maps have 5% increased Toughness per Flammable Burrow destroyed'], { kind: 'notable' });
    expect(compareNotables(o, n).status).toBe('nerfed');
  });
});

describe('strategy scaling', () => {
  it('re-evaluates an effect for fewer scarabs than the limit', () => {
    const base = evaluateEffect(
      { label: 'Magic pack size', scarab: 40, unit: '%', tree330: [{ text: 'increased Magic Pack Size' }] },
      2,
      [],
      [node('d', 'Deep Bloodlines', ['25% increased Magic Pack Size in your Maps'], { kind: 'notable' })],
    );
    expect(base.retention).toBeCloseTo(25 / 80);
    const one = effectForCount(base, 1);
    expect(one.scarabPower).toBe(40);
    expect(one.retention).toBeCloseTo(25 / 40);
  });

  it('maps retention to a verdict', () => {
    expect(verdictFor(1.2)).toBe('better');
    expect(verdictFor(0.97)).toBe('same');
    expect(verdictFor(0.8)).toBe('mild');
    expect(verdictFor(0.5)).toBe('nerfed');
    expect(verdictFor(0.2)).toBe('gutted');
    expect(verdictFor(null)).toBe('unknown');
  });
});

describe('mechanic taxonomy', () => {
  it('separates content, additive layers and juice', () => {
    expect(categoryOf('Abyss')).toBe('primary');
    expect(categoryOf('Essence')).toBe('secondary');
    expect(categoryOf('Delirium')).toBe('tertiary');
    expect(categoryOf('Maven')).toBe('overlay');
    expect(categoryOf('The Eater of Worlds')).toBe('overlay');
    expect(categoryOf('Maps')).toBe('juice');
    expect(layerOf(categoryOf('Breach'))).toBe('content');
    expect(layerOf(categoryOf('The Searing Exarch'))).toBe('overlay');
  });

  it('filters by mechanic, by category, or across a scarab\'s mechanics', () => {
    expect(matchesMechanic('Abyss', '')).toBe(true);
    expect(matchesMechanic('Abyss', 'cat:primary')).toBe(true);
    expect(matchesMechanic('Maven', 'cat:primary')).toBe(false);
    expect(matchesMechanic(['The Searing Exarch', 'The Eater of Worlds'], 'The Eater of Worlds')).toBe(true);
  });

  it('orders categories before names', () => {
    expect(['Maven', 'Abyss', 'Essence'].sort(compareMechanics)).toEqual(['Abyss', 'Essence', 'Maven']);
  });
});

describe('stacked values', () => {
  it('rewrites a stat line with its stacked total', () => {
    expect(withValue('Your Maps have +25% Surpassing Chance to contain a Shrine', 400)).toBe('Your Maps have +400% Surpassing Chance to contain a Shrine');
    expect(withValue('Tier 1-15 Maps found have 5% chance to become 1 tier higher', 50)).toBe('Tier 1-15 Maps found have 50% chance to become 1 tier higher');
    expect(likeText('Your Maps contain 4 additional Packs', 8)).toBe('8');
    expect(surpassLong(560)).toBe('5 guaranteed + 60% chance for a 6th');
    expect(surpassLong(500)).toBe('5 guaranteed');
  });
});

describe('scarab look-alike detection', () => {
  it('scores a nerfed copy of a scarab above unrelated text', () => {
    const risk = 'Area has 2 additional random Modifiers';
    expect(resemblance(risk, 'Your Maps have an additional random Modifier')).toBeGreaterThan(0.5);
    expect(resemblance(risk, 'Your Maps have 50% increased chance to contain a Mirage')).toBeLessThan(0.2);
  });
});

import { rank, type SearchEntry } from '../src/lib/search.ts';

describe('search ranking', () => {
  const e = (label: string, kind: SearchEntry['kind'], keywords = ''): SearchEntry => ({ id: `${kind}:${label}`, kind, label, keywords, mechanics: [], target: { tab: 'x' } });
  const entries = [
    e('Cartography Scarab of Risk', 'scarab', 'area has 2 additional random modifiers'),
    e('Shaping the Valleys', 'notable', 'your maps have an additional random modifier'),
    e('Essence Scarab', 'scarab'),
    e('Essence Scarab of Ascent', 'scarab'),
    e('Essence', 'mechanic'),
  ];

  it('ranks exact and prefix label matches first', () => {
    expect(rank(entries, 'essence').map((h) => h.entry.label)).toEqual(['Essence', 'Essence Scarab', 'Essence Scarab of Ascent']);
  });

  it('matches every word anywhere (label or keywords), labels first', () => {
    // Neither label contains the words, so both are found through their keywords.
    const hits = rank(entries, 'random modifier');
    expect(hits.map((h) => h.entry.label).sort()).toEqual(['Cartography Scarab of Risk', 'Shaping the Valleys']);
    expect(rank(entries, 'risk')[0].entry.label).toBe('Cartography Scarab of Risk');
  });

  it('marks the matched part of the label for highlighting', () => {
    const [hit] = rank(entries, 'valley');
    expect(hit.entry.label.slice(...hit.match!)).toBe('Valley');
  });

  it('returns nothing for an empty query', () => {
    expect(rank(entries, '   ')).toEqual([]);
  });
});

describe('effect names', () => {
  it('keeps numbers every node shares, hides the headline value', () => {
    const t = '#% chance for a Strongbox in your Tier # Maps to be replaced with the Empyrean Apparatus';
    expect(effectTitle(t, ['10% chance for a Strongbox in your Tier 16 Maps to be replaced with the Empyrean Apparatus'])).toBe(
      'X% chance for a Strongbox in your Tier 16 Maps to be replaced with the Empyrean Apparatus',
    );
  });

  it('hides numbers that differ between nodes', () => {
    expect(effectTitle('Your Maps have a #% chance to contain # additional Rogue Exiles', ['Your Maps have a 5% chance to contain 20 additional Rogue Exiles', 'Your Maps have a 5% chance to contain 10 additional Rogue Exiles'])).toBe(
      'Your Maps have a X% chance to contain X additional Rogue Exiles',
    );
  });

  it('shows a range whole or not at all', () => {
    expect(effectTitle('Maps modified in this way have #-# additional random Map Modifiers', ['Maps modified in this way have 1-3 additional random Map Modifiers'])).toBe(
      'Maps modified in this way have X-X additional random Map Modifiers',
    );
    expect(effectTitle('Tier #-# Maps found have #% chance to become # tier higher', ['Tier 1-15 Maps found have 3% chance to become 1 tier higher'])).toBe(
      'Tier 1-15 Maps found have X% chance to become 1 tier higher',
    );
  });
});

describe('effects that became an item', () => {
  it('keeps the ember fate and the item, without a retention', () => {
    const r = evaluateEffect({ label: 'Packs', scarab: 1, unit: 'content', stacks: false, fate: 'ember', item: 'Allflame Ember of the Cloister' }, 1, [], []);
    expect(r.fate).toBe('ember');
    expect(r.item).toBe('Allflame Ember of the Cloister');
    expect(r.retention).toBeNull();
    expect(overallFate([r, { ...r, fate: 'removed' }])).toBe('ember');
  });
});
