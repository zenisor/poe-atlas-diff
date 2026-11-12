/**
 * 3.30.0 patch notes that matter for Atlas farming but are not on the Atlas tree,
 * paraphrased and tagged with the site's mechanic names (validated in build-data).
 * Source: https://www.pathofexile.com/forum/view-thread/4013680
 *
 * Scarab-specific consequences live in scarab-map.ts (OUTSIDE); this file is the
 * wider context shown on mechanic pages, strategies and the overview.
 */

export const PATCH_NOTES_URL = 'https://www.pathofexile.com/forum/view-thread/4013680';

export type PatchSection = 'Endgame' | 'Atlas tree' | 'League' | 'Item generation' | 'Monsters';

export interface PatchNote {
  text: string;
  mechanics: string[];
  section: PatchSection;
}

const PRIMARY = ['Abyss', 'Bestiary', 'Betrayal', 'Blight', 'Breach', 'Expedition', 'Incursion', 'Legion', 'Ritual', 'Ultimatum'];
const EXARCH_THREADS = ['Abyss', 'Expedition', 'Betrayal', 'Bestiary', 'Ultimatum'];
const EATER_THREADS = ['Breach', 'Legion', 'Blight', 'Ritual', 'Incursion'];

/** The biggest changes to how Maps and loot work, shown on the overview. */
export const ATLAS_WIDE: { title: string; text: string }[] = [
  {
    title: 'League mechanics come from Threads',
    text: 'Abyss, Bestiary, Betrayal, Blight, Breach, Expedition, Incursion, Legion, Ritual and Ultimatum no longer appear in Maps on their own. You add them with Threads (up to 8 per Map, with rising chances for transformative effects), and each Shaped Region gives its Maps free Threads of one type.',
  },
  {
    title: 'Item Quantity became Atlas Drops',
    text: 'Quantity on Map modifiers is now "Atlas Drops" at the same values. It raises Maps, Threads and league resources (Hiveblood, Lifeforce, Splinters and the like), not items in general. Unidentified Maps give +30% Atlas Drops.',
  },
  {
    title: 'Rarity decides what drops',
    text: 'Item Rarity now picks the drop pool: more Rarity means fewer Scrolls and more valuable currency, rarer Divination Cards and better Uniques. Magic and Rare monster modifiers give more Rarity and no Quantity.',
  },
  {
    title: 'Quantity sources turned into Rarity',
    text: 'Delirium fog, Sentinels, Opulent Rituals, Tempests, Covetous Shrines and Verisium monsters no longer add Quantity. The Quantity Map implicit is gone and the Rarity one is now +10–20%.',
  },
  {
    title: 'Less Rarity from Map juice',
    text: 'Rarity on Nightmare and Originator Map modifiers is roughly 40–50% lower. Eldritch Altars give 10–20% Rarity (was 15–30%), Memory Trace Altars 20–25% (was 25–40%), and the Quantity altars are gone. Maven\'s Chisel of Procurement gives +25% Rarity at 20% quality (was 40%).',
  },
  {
    title: 'More Atlas points',
    text: 'The tree has 150 points (was 138). The Maven, the Searing Exarch, the Eater of Worlds and each of the six Maven Invitations give 2 points each, and the Uber Elder gives 4.',
  },
  {
    title: 'Map items work differently',
    text: 'Delirium Orbs, Allflame Embers and Divine Vessels are now used on the Map item itself. A Vaal Orb on a Map adds 2 modifiers (up to 9) instead of rerolling it to 8, and Rare Maps can roll suffixes that add a Mirage, the Viridian Wildwood, a buried Sentinel, an Evocator or a Mirror of Delirium.',
  },
  {
    title: 'New Map pool',
    text: '31 Maps came back to the Atlas and 31 left it. Vaal Side Areas no longer appear in Maps.',
  },
];

export const PATCH_NOTES: PatchNote[] = [
  // ── Primary league mechanics ──
  { section: 'Endgame', mechanics: PRIMARY, text: 'No longer appears in Maps on its own: it comes from its Thread, and Shaped Regions give free Threads of their type.' },
  { section: 'Endgame', mechanics: ['The Searing Exarch', ...EXARCH_THREADS], text: 'Searing Exarch Altars can make Eldritch monsters or the Map Boss drop Abyss, Expedition, Betrayal, Bestiary or Ultimatum Threads.' },
  { section: 'Endgame', mechanics: ['The Eater of Worlds', ...EATER_THREADS], text: 'Eater of Worlds Altars can make Eldritch monsters or the Map Boss drop Breach, Legion, Blight, Ritual or Incursion Threads.' },
  { section: 'Endgame', mechanics: ['Bestiary', 'Betrayal', 'Incursion'], text: 'Astrolabes now place a Shaped Region of their type on a chosen Map. New ones: Feral (Bestiary), Immortal (Betrayal) and Royal (Incursion).' },
  { section: 'Endgame', mechanics: ['Abyss'], text: "Merrick's Ducat works on Abyssal Jewels directly and has a new source outside Allflame encounters." },
  { section: 'League', mechanics: ['Bestiary'], text: 'Yellow beasts are no longer captured. Only red beasts and bosses are, and flask beastcrafts now take any red beast.' },
  { section: 'League', mechanics: ['Bestiary'], text: 'The Atlas passives that make beasts rarer varieties are more effective.' },
  { section: 'League', mechanics: ['Betrayal'], text: 'Safehouse rewards changed: Intervention members drop trapped stashes of one Unique item class, other Safehouse rewards that gave Scarabs give a specific Allflame Ember, and Rin gives Threads.' },
  { section: 'League', mechanics: ['Betrayal'], text: 'Catarina always drops an Allflame Ember of Propagation, of Kulemak or of the Ethereal. Veiled items no longer drop outside Betrayal.' },
  { section: 'Endgame', mechanics: ['Blight'], text: 'The number of Blight chests per lane scales with Atlas Drops. Silver-oiled Blighted Maps give +80% Rarity instead of Quantity.' },
  { section: 'League', mechanics: ['Expedition'], text: "Gwennen no longer gambles items. She offers a coin-flip craft on one of your Rare items instead, paid with Astragali and artifacts." },
  { section: 'Item generation', mechanics: ['Expedition'], text: 'The Remnant for increased Item Quantity is gone, and Remnants no longer make chests or Runic monsters drop Fractured items.' },
  { section: 'League', mechanics: ['Expedition', 'Torment'], text: 'Tormented Spirits that spawn near an Expedition sit in gravestones you can blow up to free them and more spirits.' },
  { section: 'League', mechanics: ['Incursion'], text: 'Atziri moved into the Temple. With the Cradle of Creation room the Temple is level 84 with Uber Atziri. Vials and the Mortal and Sacrifice Fragments are gone.' },
  { section: 'League', mechanics: ['Incursion'], text: 'Royal Visage (from Atziri in level 81+ Temples) enchants a Tier 16 Map so its Incursions are Alluring: harder and more rewarding.' },
  { section: 'League', mechanics: ['Incursion', 'Maps'], text: "The Temple's map rooms drop Maps as Rare and Corrupted, and have a device that corrupts a Map a second time." },
  { section: 'League', mechanics: ['Incursion'], text: 'Glittering Halls and the jewel rooms give less Rarity (Glittering Halls up to 36%, was 60%). Atziri can drop Soul Cores.' },
  { section: 'Endgame', mechanics: ['Legion'], text: 'Breaking out Legion monsters and chests fills the Schism about a third slower.' },
  { section: 'League', mechanics: ['Ritual'], text: 'Blood-Filled Vessels only go on Maps with Ritual Threads: 2 slots at 4 or more Threads, 3 slots at 8.' },
  { section: 'League', mechanics: ['Ritual'], text: 'Rerolling past the first window no longer guarantees an Audience with the King or a Waxen Soul, but always gives at least one Omen.' },
  { section: 'League', mechanics: ['Ritual'], text: "Wisp's Blessing gives 50% increased Tribute (was 30%). Opulent Rituals give Rarity instead of Quantity." },
  { section: 'League', mechanics: ['Ultimatum'], text: 'Rewards keep getting better after round 10 (before, every later round paid like round 10).' },

  // ── Secondary ──
  { section: 'Endgame', mechanics: ['Essence'], text: 'Weeping Essences no longer appear on monsters in yellow or red Maps, and Wailing ones not in red Maps.' },
  { section: 'Endgame', mechanics: ['Essence'], text: 'The average number of Essences on Imprisoned Monsters scales with Atlas Drops. New: Essence of Trickery.' },
  { section: 'League', mechanics: ['Harvest / Sacred Flora'], text: 'The Sacred Grove is gone. Sacred Flora spawn in the Map, release Sacred Fauna that drop Lifeforce, then spread Wildwood Wisps.' },
  { section: 'League', mechanics: ['Harvest / Sacred Flora'], text: 'In high-tier Maps a Flora can be a Sacred Specimen that spawns a Harvest Boss.' },
  { section: 'League', mechanics: ['Harvest / Sacred Flora'], text: 'Tier 1 seeds drop no Lifeforce and Tier 2 less, but stacks are bigger, so the total should stay similar.' },
  { section: 'Endgame', mechanics: ['Mercenaries'], text: 'Mercenary Warrants are no longer used with a Map. They open the Proving Grounds on the Atlas to fight that Mercenary again.' },
  { section: 'Endgame', mechanics: ['Rogue Exiles'], text: 'Rogue Exiles have much higher base Rarity and give more experience.' },
  { section: 'Endgame', mechanics: ['Rogue Exiles'], text: 'Exceptional Rogue Exiles lost the bonuses that dropped their items Mirrored, Fractured or upgraded.' },
  { section: 'Endgame', mechanics: ['Rogue Exiles'], text: 'Gigantic Rogue Exiles have more Life and Quantity, and their split clones keep all their modifiers.' },
  { section: 'Endgame', mechanics: ['Settlers of Kalguur'], text: 'Ore Deposits give 50% more Ore. Channelling a Verisium Outcrop gives an experience and Thaumaturgic Dust buff.' },
  { section: 'Endgame', mechanics: ['Settlers of Kalguur', 'Gold'], text: 'Petrified Amber gives a buff that can duplicate Gold. Starfall Craters spawn more often.' },
  { section: 'Item generation', mechanics: ['Settlers of Kalguur'], text: 'Shipping Ore and Bars only rewards rarer currency, with no quality currency.' },
  { section: 'Endgame', mechanics: ['Shrines'], text: 'Covetous Shrines have a base spawn chance (and give Rarity instead of Quantity). Gloom and Resonating Shrines are more common.' },
  { section: 'Monsters', mechanics: ['Strongboxes'], text: 'Packs from Strongboxes can be Magic or Rare.' },
  { section: 'Endgame', mechanics: ['Strongboxes'], text: 'Strongbox modifiers that added items can roll them at any rarity, Quality is +5–20% and chest level +1–2. The Identified and Mirrored modifiers are gone.' },
  { section: 'Endgame', mechanics: ['Strongboxes', 'Scarabs → Threads'], text: "Operative's Strongboxes are gone, and the modifiers that dropped Scarabs drop 2–5 Threads of one type." },
  { section: 'Endgame', mechanics: ['Strongboxes', 'Maps'], text: 'The Empyrean Apparatus only spawns through Explorer\'s Reliquary (Tier 16). It has 5 Unique bosses and drops a Unique Map plus a Tier 16 Monstrous Treasure Map.' },
  { section: 'Endgame', mechanics: ['Torment', 'Scarabs → Threads'], text: 'Tormented Heretics have a base spawn chance. Monsters they touch can drop Threads, and ones they possess drop more.' },

  // ── Tertiary ──
  { section: 'Endgame', mechanics: ['Beyond'], text: 'Maps can start with a Demonic Evocator. Using it lets monsters open Beyond portals, and Beyond bosses can reveal an entrance to their Demonic realm.' },
  { section: 'Endgame', mechanics: ['Beyond'], text: 'Portal chance scales with monster power (Uniques can open several), portals keep spawning after a boss, and Beyond monsters drop more Tainted Currency.' },
  { section: 'Endgame', mechanics: ['Delirium'], text: 'Delirium Orbs reroll a Rare Map with a Delirious modifier (5–50% each, up to 100%): one reward of that type plus one per 20%. Mixing types resets it.' },
  { section: 'Endgame', mechanics: ['Delirium'], text: 'In higher Maps, Mirror fog spreads faster and lasts longer, with more bosses, Delirium Orbs, Cluster Jewels and Splinters. Mirrors can add 1–3 bonus rewards.' },
  { section: 'Endgame', mechanics: ['Delirium', 'Mirage'], text: 'Delirium bosses in Tier 14+ Maps can drop Refracting Fog, no Mirage needed.' },
  { section: 'League', mechanics: ['Mirage'], text: 'Mirage is now core: Mirages appear in Maps, and The Black Barya is on the Atlas in every league (area level 84).' },
  { section: 'Endgame', mechanics: ['Sentinels', 'Viridian Wildwood'], text: 'Buried Sentinels and the Viridian Wildwood can spawn in any Map tier (was Tier 16 only).' },
  { section: 'Endgame', mechanics: ['Beyond', 'Delirium', 'Mirage', 'Sentinels', 'Viridian Wildwood'], text: 'Rare Maps can roll a suffix that adds this content directly.' },

  // ── Additive layers ──
  { section: 'Atlas tree', mechanics: ['Maven', 'The Searing Exarch', 'The Eater of Worlds'], text: 'The quest reward for each of these bosses (and each Maven Invitation) is 2 Atlas points (was 1).' },
  { section: 'Atlas tree', mechanics: ['The Shaper and Elder'], text: 'The Uber Elder gives 4 Atlas points (was 1).' },
  { section: 'Endgame', mechanics: ['Maven', 'Scarabs → Threads'], text: "Maven's Chisel of Scarabs is now Maven's Chisel of Threads. Maven's Chisel of Procurement gives +25% Rarity at 20% quality (was 40%)." },
  { section: 'Endgame', mechanics: ['The Searing Exarch', 'The Eater of Worlds'], text: 'Eldritch Altars give 10–20% Rarity (was 15–30%), the Quantity altars are gone, and the duplicate-drop altars now duplicate Threads.' },
  { section: 'Endgame', mechanics: ['The Shaper and Elder', 'Conquerors'], text: 'Shaper, Elder and Conqueror fragments no longer add Quantity and are not consumed when used with a Map.' },
  { section: 'Endgame', mechanics: ['Atlas Memories'], text: 'Memory Altars no longer enable primary league mechanics. New ones add Ore Deposits, Mercenaries, Beyond, Sentinels, the Viridian Wildwood or a Mirage.' },
  { section: 'Endgame', mechanics: ['Atlas Memories'], text: 'Memory Trace Altars give 20–25% Rarity (was 25–40%). The Originator Voidstone no longer adds Memory Strands to dropped equipment.' },
  { section: 'Endgame', mechanics: ['Atlas Memories', 'Maps'], text: 'Rarity on Nightmare and Originator Map modifiers is about 40–50% lower.' },
  { section: 'Endgame', mechanics: ['Atlas Anomalies'], text: 'The chance for an Anomaly drops with the number of monsters left when the Map Boss dies.' },
  { section: 'Endgame', mechanics: ['Atlas Anomalies'], text: 'Templar Vaults are now Anomalies from Pinnacle Eldritch bosses in each quadrant, not a Shaped Region reward.' },

  // ── Juice & rewards ──
  { section: 'Item generation', mechanics: ['Maps', 'Scarabs → Threads'], text: 'Quantity on Map modifiers is now Atlas Drops: more Maps, Threads and league resources. Unidentified Maps give +30% Atlas Drops.' },
  { section: 'Item generation', mechanics: ['Maps'], text: 'The Quantity Map implicit is gone and the Rarity implicit is +10–20%.' },
  { section: 'Endgame', mechanics: ['Maps'], text: 'A Vaal Orb on a Map adds 2 modifiers (up to 9) instead of rerolling it to 8.' },
  { section: 'Endgame', mechanics: ['Maps'], text: '31 Maps came back to the Atlas and 31 left it. Pillars of Arun has 100–150% Rarity (was 200–300%).' },
  { section: 'Endgame', mechanics: ['Unique Monsters', 'Maps'], text: 'Divine Vessels are used on the Map (Deified): Map Bosses are tougher and hit harder, with 50% increased Rarity. They stack to 20.' },
  { section: 'Endgame', mechanics: ['Scarabs → Threads'], text: 'Scarabs convert to a matching Thread or a Frayed Thread, and most former Scarab sources now give Threads.' },
  { section: 'Item generation', mechanics: ['Magic Monsters', 'Rare Monsters'], text: 'Magic and Rare monster modifiers give more Rarity and no Quantity. Rare monsters have slightly more base Quantity.' },
  { section: 'Item generation', mechanics: ['Magic Monsters', 'Rare Monsters', 'Unique Monsters'], text: 'Rarity now picks the drop pool, so high-Rarity monsters drop better currency instead of fewer currency items.' },
  { section: 'Item generation', mechanics: ['Divination Cards'], text: 'Monsters with high Rarity drop rarer Divination Cards more often, and some common cards are blocked from them.' },
  { section: 'League', mechanics: ['Divination Cards'], text: 'Several cards are disabled for now, and cards no longer give league-specific items.' },

  // ── Removed from the tree ──
  { section: 'Endgame', mechanics: ['Heist'], text: "Smuggler's Caches only appear on specific Maps and give more Blueprints and Rogue Markers. Contracts and Blueprints left the core drop pool." },
  { section: 'Endgame', mechanics: ['Delve'], text: 'Sulphite only appears on specific Maps, always guarded, and gives more Sulphite.' },
  { section: 'League', mechanics: ['Vaal Side Areas'], text: 'Vaal Side Areas no longer appear in Maps, and the Map implicit that added one is gone.' },
];
