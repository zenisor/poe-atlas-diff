/**
 * Notable/keystone pairings the name-matcher can't find on its own:
 * renames, merges into multiple-choice notables, and same-name notables
 * whose numbers changed meaning (guaranteed +1 → Surpassing Chance).
 *
 * `new: []` marks a removal and gives a reason.
 * The build fails if a name here doesn't exist in its tree.
 */
import type { NotableLink } from '../../src/lib/diff.ts';

const CONTENT_THREADS =
  'Primary league content is now added to maps with Threads (up to 8 per map, max 3 types). Notables that raised the chance for that content to spawn were removed.';
const BLOCKERS =
  'Content-blocking notables ("no chance to contain X") were removed. Unthreaded / Threadbare now block Thread *types* from dropping instead.';
const TERTIARY =
  'Tertiary mechanic: the 3.30 tree only has notables that raise the chance for it to appear.';

export const NOTABLE_LINKS: NotableLink[] = [
  // ---- Guaranteed +1 became Surpassing Chance (+60% = 0.6 expected) ----
  { old: ['Prolific Essence'], new: ['Prolific Essence'], status: 'nerfed', note: 'Was a guaranteed +1 Imprisoned Monster (100%); now +60% Surpassing Chance (+0.6 expected).' },
  { old: ['Supplication'], new: ['Supplication'], status: 'nerfed', note: 'Was a guaranteed +1 Shrine (100%); now +60% Surpassing Chance (+0.6 expected).' },
  { old: ['Unexpected Stranger'], new: ['Unexpected Stranger'], status: 'nerfed', note: 'Was a guaranteed +1 Rogue Exile (100%); now +60% Surpassing Chance (+0.6 expected).' },
  { old: ['Paranormal Meeting'], new: ['Paranormal Meeting'], status: 'nerfed', note: 'Was a guaranteed +1 Tormented Spirit (100%); now +60% Surpassing Chance (+0.6 expected).' },
  { old: ['Twice Tempted'], new: ['Twice Tempted'], status: 'nerfed', note: 'Was a guaranteed +1 Strongbox (100%); now +60% Surpassing Chance (+0.6 expected).' },
  { old: ['Call of the Grove'], new: ['Call of the Grove'], status: 'changed', note: 'Was +30% chance for the Sacred Grove; now +40% Surpassing Chance for Sacred Flora (Harvest reworked).' },
  { old: ['Doubling Season'], new: ['Doubling Season'], status: 'buffed', note: 'Lifeforce duplication 10% → 15% (Harvest Monsters → Sacred Fauna).' },
  { old: ['Multiplying Modifiers'], new: ['Multiplying Modifiers'], status: 'changed', note: 'Was 3% map modifier effect per Fragment (up to 5 scarabs = 15%); now 5% per *different* Thread type (max 3 types = 15%).' },
  { old: ['Speaker of the Dead'], new: ['Speaker of the Dead'], status: 'buffed', note: 'Possession lasts 30s (was 20s) and you can touch up to 50 normal/magic monsters.' },

  // ---- Renames / reworks (1:1) ----
  { old: ['Effective Leadership'], new: ['Head of the Snake'], note: 'Renamed, same effect.' },
  { old: ['Bribery'], new: ['Hard Bargain'] },
  { old: ['Test of Loyalty'], new: ['Enduring Legacy'], note: 'Extra rank chance 100% → 50%.' },
  { old: ['Adaptive Reaction'], new: ['Kindled Flame'] },
  { old: ['Logistical Support'], new: ['Battle-Tested'] },
  { old: ['Deadly Prey'], new: ['Beasts of Prey'], note: 'Renamed, same effect.' },
  { old: ['Two-Hearted Hunt'], new: ['Nose-to-Tail'], note: 'Renamed, same effect.' },
  { old: ['Natural Selection'], new: ['Endangered Species'], note: 'Renamed, same effect.' },
  { old: ['Mighty Hunter'], new: ['Fellow Hunter'], note: 'Lost the 100% Einhar cooldown recovery line (now on small nodes).' },
  { old: ['Big Game'], new: ['Herd Mentality'], note: 'Yellow → Red beast replacement 15% → 25%.' },
  { old: ['Protracted Battle'], new: ['Prolonged Struggle'] },
  { old: ['Face Off'], new: ['Leader of Men'] },
  { old: ['Immune Response'], new: ['Rampant Infection'] },
  { old: ['Fungal Horizons'], new: ['Biological Vector'], note: 'Lost Blightreach on completion; gained a chance for Blighted Maps with 3 extra anointments.' },
  { old: ['Answered Appeals'], new: ['Exacting Tribute'] },
  { old: ['Corrupted Gaze'], new: ['Suffused with Darkness'], note: 'Now a multiple-choice notable (corrupted 5–6 mods OR veiled modifier).' },
  { old: ['All That Glitters'], new: ['Path of Worship'], note: 'Covetous Shrine chance became a multiple-choice "type" notable.' },

  // ---- Merges into one notable / multiple-choice notables ----
  { old: ['Sustained Horde', 'Trail of Destruction'], new: ['Sustained Horde'], note: 'Both effects merged into one notable (25% chance for +3 pits, was 20%).' },
  { old: ['Inspired Darkness', 'Skittering Darkness'], new: ['Subterranean Treasures'], note: 'Merged. Skitterlocks became Abyssal Weavings.' },
  { old: ['Pillaged Treasures', 'War Supplies'], new: ['Extra Provisions'], note: 'Merged. Lost the 100% increased chest break-out range.' },
  { old: ['Profitable Prayers', 'Flexible Dogma'], new: ['Flexible Dogma'], note: 'Merged: +2 rerolls and 1 free reroll. Lost the 18% reduced reroll cost.' },
  { old: ['Dimensional Foothold', 'Enemy at the Gates'], new: ['Divide and Conquer'], note: 'The two keystones became one multiple-choice notable (Hives OR Unstable Breaches).' },
  { old: ['Contested Development', 'Resource Reallocation'], new: ['Power Struggle'], note: 'Merged into a multiple-choice notable. The non-resident option is now guaranteed (was 40%).' },
  { old: ['Conquer The Stones', 'Protect The Altar', 'Slaughter Them All', 'Survive The Assault'], new: ['Controlled Chaos'], note: 'Four objective notables merged into one multiple-choice notable with stronger values.' },
  { old: ['Worthy of the Past', 'Worthy of the Present', 'Worthy of the Future'], new: ["Trialmaster's Boon"], note: 'Merged into one multiple-choice notable; 50% → 80% increased chance.' },
  { old: ['A Noble Quest', 'Lucky Guess', 'Rather Not', "Scratchin' up the Ground"], new: ['Kalguuran Companionship'], note: 'Expedition leader notables merged into one multiple-choice notable; 90% → 150% (Dannig 65% → 75%).' },
  { old: ['The Hunt for Craiceann', 'The Hunt for Farrul', 'The Hunt for Fenumus', 'The Hunt for Saqawal'], new: ['Hunting Grounds'], note: 'Merged into a multiple-choice notable that also adds a Red Beast from the chosen region.' },
  { old: ['Absent Warriors', 'Education Cuts', 'Skills Shortage'], new: ['Trarthan Policy'], note: 'Merged into one multiple-choice notable.' },
  { old: ['Azadi Supremacy', 'Cyaxan Supremacy', 'Keitan Supremacy'], new: ['House Supremacy'], note: 'House-weighting notables became a class-weighting multiple-choice notable (200%).' },
  { old: ['Buried Knowledge'], new: ['Dead and Buried', 'What Lies Beneath '], note: 'Split into a Runic marker notable (50%, was 20%) and a Logbook notable (60%, was 50%).' },
  {
    old: ['Crystalline Carapaces', 'Devoted Carapaces', 'Explorative Carapaces', 'Harrowing Carapaces', 'Outcasted Carapaces', 'Possessed Carapaces', 'Tainted Carapaces', 'Towering Carapaces', 'Trapping Carapaces'],
    new: ['Dextral Threads', 'Sinistral Threads'],
    note: 'Scarab-type weighting notables became two multiple-choice Thread-type notables (200% increased chance).',
  },
  {
    old: ['Loved by the Sun', 'Sealed Domain', 'Fungal Remission', 'Dimensional Barrier', 'Secular Focus', 'Servant of Order', 'Trade Embargo', 'Ominous Silence', 'Black Thumb', 'Civil War in Trarthus', "Miner's Strike", 'Straight and Narrow'],
    new: ['Unthreaded', 'Threadbare'],
    note: BLOCKERS,
  },

  // ---- Primary-content chance notables (now via Threads) ----
  { old: ['Constant Battle'], new: [], note: CONTENT_THREADS },
  { old: ['Monumental'], new: [], note: CONTENT_THREADS },
  { old: ['Broken Border'], new: [], note: CONTENT_THREADS },
  { old: ['Eternal Hunt'], new: [], note: CONTENT_THREADS },
  { old: ['Obsessed with Vengeance'], new: [], note: CONTENT_THREADS },
  { old: ['Fungal Bloom'], new: [], note: CONTENT_THREADS },
  { old: ['Face The Ultimatum'], new: [], note: CONTENT_THREADS },
  { old: ['Hunt for Answers'], new: [], note: CONTENT_THREADS },
  { old: ['Just in Time!'], new: [], note: CONTENT_THREADS },
  { old: ['Sacred Lands'], new: [], note: CONTENT_THREADS },
  { old: ['Underground Kingdom'], new: [], note: CONTENT_THREADS },
  { old: ['Frantic Mining'], new: [], note: 'Delve Atlas clusters were removed in 3.30.' },
  { old: ['Prospector\'s Luck'], new: ['Prospector\'s Luck'], note: 'Lost the Kalguuran Scarab weighting; Ore Deposit chance unchanged.' },
  { old: ['Minor Fiefdoms'], new: ['Minor Fiefdoms'], note: 'Lost the Trarthan Scarab weighting; Mercenary chance unchanged.' },
  { old: ['That Which You Seek'], new: ['That Which You Seek'], status: 'changed', note: `${TERTIARY} Was +24% chance (flat); now 60% increased chance.` },
  { old: ['Scent of Blood'], new: ['Scent of Blood'], status: 'changed', note: `${TERTIARY} Was 16% chance to attract Beyond; now 60% increased Demonic Evocator chance.` },
  { old: ['Torn Veil'], new: ['Torn Veil'], status: 'changed', note: `${TERTIARY} Was 30% increased chance for Beyond Unique Bosses; now 50% increased Demonic Evocator chance.` },
  { old: ['Descent Into Madness'], new: ['Descent Into Madness'], status: 'changed', note: `${TERTIARY} Was "Delirium increases 50% faster with distance"; now 50% increased mirror chance.` },
];
