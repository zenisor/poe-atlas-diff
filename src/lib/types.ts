// Shared types for the build pipeline (scripts/) and the UI (src/).
import type { MechanicCategory } from './mechanics.ts';

export type Version = '3.29' | '3.30';

export type NodeKind = 'small' | 'notable' | 'keystone' | 'mastery' | 'wormhole' | 'root';

/** Raw node shape from grindinggear/atlastree-export data.json (only fields we use). */
export interface RawNode {
  skill?: number;
  name?: string;
  icon?: string;
  stats?: string[];
  isNotable?: boolean;
  isKeystone?: boolean;
  isMastery?: boolean;
  isWormhole?: boolean;
  isMultipleChoiceVariant?: boolean;
  variantEffects?: { effect: number; stats: string[] }[];
  reminderText?: string[];
  group: number;
  orbit: number;
  orbitIndex: number;
  out: string[];
  in: string[];
}

export interface RawTree {
  tree: string;
  groups: Record<string, { x: number; y: number; orbits: number[]; nodes: string[] }>;
  nodes: Record<string, RawNode>;
  min_x: number;
  min_y: number;
  max_x: number;
  max_y: number;
  constants: { skillsPerOrbit: number[]; orbitRadii: number[] };
  points: { totalPoints: number; ascendancyPoints: number };
  sprites: Record<string, Record<string, { filename: string; w: number; h: number; coords: Record<string, { x: number; y: number; w: number; h: number }> }>>;
}

/** A parsed stat line. */
export interface StatLine {
  /** Display text with markup removed. */
  text: string;
  /** Text with every number replaced by '#'. Used to match effects across versions. */
  template: string;
  /** All numbers in the line, in order. */
  values: number[];
  /** The "headline" number used for totals (first number followed by %, else first number). */
  main: number | null;
  /** True when the line uses the 3.30 "Surpassing Chance" keyword (every 100% = +1 guaranteed). */
  surpassing: boolean;
}

export interface TreeNode {
  id: string;
  name: string;
  /** Sprite key of the node's art (icon path from the export, or 'Wormhole'). */
  icon: string;
  kind: NodeKind;
  mechanic: string;
  stats: StatLine[];
  /** Multiple-choice notables: pick exactly one variant. */
  variants?: StatLine[][];
  x: number;
  y: number;
  out: string[];
}

export type EffectStatus = 'added' | 'removed' | 'buffed' | 'nerfed' | 'unchanged' | 'reshuffled' | 'reworded';

export interface EffectContribution {
  nodeId: string;
  nodeName: string;
  kind: NodeKind;
  value: number | null;
  text: string;
  /** Comes from a multiple-choice variant (only one variant per node can be taken). */
  choice?: boolean;
}

export interface EffectSide {
  templates: string[];
  /** Sum of main values over non-choice contributions. */
  total: number;
  /** Best-case total including the best variant per choice node. */
  totalWithChoices: number;
  nodeCount: number;
  surpassing: boolean;
  contributions: EffectContribution[];
}

export interface EffectDiff {
  key: string;
  label: string;
  mechanic: string;
  status: EffectStatus;
  old: EffectSide | null;
  new: EffectSide | null;
  /** (new - old) / old for comparable effects. */
  deltaPct: number | null;
  /** True when a lower number is better for the player (e.g. a downside). */
  lowerIsBetter?: boolean;
  note?: string;
  /** Unlinked removed/added effects get a hint at the most similar effect on the other side. */
  similar?: { key: string; label: string; score: number };
}

export type NotableStatus = 'unchanged' | 'buffed' | 'nerfed' | 'mixed' | 'changed' | 'replaced' | 'removed' | 'added';

export interface NotableRef {
  id: string;
  name: string;
  icon: string;
  kind: NodeKind;
  mechanic: string;
  stats: string[];
  variants?: string[][];
}

export interface NotableValueChange {
  template: string;
  old: number | null;
  new: number | null;
  better: boolean | null;
}

export interface NotableDiff {
  key: string;
  mechanic: string;
  status: NotableStatus;
  old: NotableRef[];
  new: NotableRef[];
  changes: NotableValueChange[];
  note?: string;
  similar?: { name: string; score: number };
}

// ---------- Scarabs ----------

export type Fate = 'full' | 'reduced' | 'partial' | 'chance' | 'thread' | 'ember' | 'reworked' | 'removed';

export interface TreeMatch {
  /** Case-insensitive substring of the stat *template* (numbers replaced by '#'). */
  text: string;
  /** Only count nodes with one of these names. */
  nodes?: string[];
  /** Ignore nodes with these names. */
  exclude?: string[];
  /** Multiply the line's value (e.g. 0.01 to turn a % chance into an expected count). */
  scale?: number;
  /** Which number in the line to use. Default: the line's main value. */
  valueIndex?: number;
  /** Use this fixed value for every matching line (for effects without a number). */
  fixed?: number;
}

export interface ScarabEffectSpec {
  /** Short description of this part of the scarab. */
  label: string;
  /** Power of ONE scarab, in `unit`. */
  scarab: number;
  unit: string;
  /** Multiply by the scarab's limit for max power. Default true. */
  stacks?: boolean;
  /** Upper bound for totals, e.g. 100 for a % chance. */
  cap?: number;
  tree329?: TreeMatch[];
  tree330?: TreeMatch[];
  /** Force a fate instead of deriving it from the numbers. */
  fate?: Fate;
  /** Display unit for the tree side when it is not comparable (fate 'chance'). */
  treeUnit?: string;
  weight?: number;
  note?: string;
  /** The 3.30 item that now gives this effect (fate 'ember'), shown with its icon. */
  item?: string;
}

/** A 3.30 change outside the Atlas tree (patch notes, Endgame section) that matters for this scarab. */
export interface OutsideNote {
  note: string;
  /** Set when the scarab's effect itself can still be had this way, e.g. 'Rare Map suffix'. */
  via?: string;
}

export interface ScarabSpec {
  effects: ScarabEffectSpec[];
  /** Mechanics this scarab belongs to (first = primary). Defaults to the scarab family's mechanic. */
  mechanics?: string[];
  /** 3.30 nodes that are related to this scarab but not counted in its numbers (different unit/target). */
  related?: { node: string; note: string }[];
  outside?: OutsideNote;
  note?: string;
}

export interface MatchedContribution {
  nodeId: string;
  nodeName: string;
  kind: NodeKind;
  text: string;
  value: number;
  choice: boolean;
  surpassing: boolean;
}

export interface ScarabEffectResult {
  label: string;
  unit: string;
  treeUnit?: string;
  perScarab: number;
  /** Whether more copies of the scarab add more power (up to the limit). */
  stacks: boolean;
  /** Upper bound applied to before/after totals, if any. */
  cap?: number;
  /** perScarab x limit (or perScarab when the effect does not stack). */
  scarabMax: number;
  tree329: number;
  tree330: number;
  /** min(cap, tree329 + scarabMax): best case in 3.29 with full tree + max scarabs. */
  before: number;
  /** min(cap, tree330): best case in 3.30 with the full tree. */
  after: number;
  /** after / before. Null when not comparable. */
  retention: number | null;
  /** Share of the scarab's max power the 3.30 tree added on top of 3.29's tree. */
  absorbed: number | null;
  fate: Fate;
  surpassing: boolean;
  weight: number;
  matches329: MatchedContribution[];
  matches330: MatchedContribution[];
  note?: string;
  item?: string;
}

export interface ScarabResult {
  id: string;
  name: string;
  family: string;
  /** Primary mechanic (used for counts and grouping). */
  mechanic: string;
  /** Every mechanic the scarab relates to (primary first). */
  mechanics: string[];
  category: MechanicCategory;
  limit: number;
  related: { nodeId: string; nodeName: string; note: string }[];
  description: string[];
  fate: Fate;
  /** Weighted best-case retention over quantifiable effects (0..). Null if nothing is quantifiable. */
  retention: number | null;
  effects: ScarabEffectResult[];
  outside?: OutsideNote;
  note?: string;
}

// ---------- Mechanics & output ----------

export interface MechanicSummary {
  name: string;
  category: MechanicCategory;
  old: { small: number; notable: number; keystone: number };
  new: { small: number; notable: number; keystone: number };
  effects: Record<EffectStatus, number>;
  notables: Record<NotableStatus, number>;
  scarabs: Record<Fate, number>;
}

export interface VersionMeta {
  version: Version;
  label: string;
  commit: string;
  totalPoints: number;
  nodeCount: number;
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

export type MapNodeStatus = 'added' | 'removed' | 'buffed' | 'nerfed' | 'changed' | 'unchanged';

/** Lightweight node for the tree map in the UI. */
export interface MapNode {
  id: string;
  name: string;
  icon: string;
  kind: NodeKind;
  mechanic: string;
  x: number;
  y: number;
  out: string[];
  stats: string[];
  variants?: string[][];
  status: MapNodeStatus;
}

// ---------- Art ----------

export type SheetKey =
  | 'normalActive'
  | 'notableActive'
  | 'keystoneActive'
  | 'wormholeActive'
  | 'normalInactive'
  | 'notableInactive'
  | 'keystoneInactive'
  | 'wormholeInactive'
  | 'mastery'
  | 'frame';

export interface SpriteSheet {
  /** Path relative to the site root (public/). */
  file: string;
  w: number;
  h: number;
  /** icon key -> [x, y, w, h] in sheet pixels */
  coords: Record<string, [number, number, number, number]>;
}

export interface AtlasArt {
  /** Sprite zoom the sheets were exported at (sheet px = world units x zoom). */
  zoom: number;
  sheets: Partial<Record<SheetKey, SpriteSheet>>;
  background: string;
  tile: string;
}

export interface IconRef {
  version: Version;
  sheet: SheetKey;
  icon: string;
}

export interface ArtManifest {
  atlas: Record<Version, AtlasArt>;
  /** Mastery art (or a representative notable) per mechanic. */
  mechanicIcons: Record<string, IconRef>;
  /** Item name -> image path (scarabs, Threads). */
  itemIcons: Record<string, string>;
}

export interface GeneratedData {
  meta: {
    generatedAt: string;
    old: VersionMeta;
    new: VersionMeta;
    sources: { label: string; url: string }[];
  };
  mechanics: MechanicSummary[];
  nodes: { old: MapNode[]; new: MapNode[] };
  effects: EffectDiff[];
  notables: NotableDiff[];
  scarabs: ScarabResult[];
  art: ArtManifest;
}

// ---------- Strategies ----------

export interface Strategy {
  id: string;
  name: string;
  description?: string;
  /** Scarab metadata id -> count. */
  scarabs: { id: string; count: number }[];
  /** Names of 3.29 notables/keystones the strategy relied on. */
  notables: string[];
  preset?: boolean;
}
