import { data } from '../data.ts';
import { REPO_URL, REPORT_URL } from '../links.ts';

export function About() {
  const { meta } = data;
  return (
    <article className="about">
      <h1>About this comparison</h1>
      <p>
        Scarabs are gone in 3.30. This site lines up every 3.29 scarab with the 3.30 Atlas tree to show what you get back, and compares the two
        trees node by node.
      </p>

      <h2>How the numbers work</h2>
      <ul>
        <li>
          A scarab's <b>max power</b> is one scarab's effect times its map limit. Essence Scarab adds 3 Imprisoned Monsters and has a limit of 5,
          so its max power is 15.
        </li>
        <li>
          <b>Best case</b> compares 3.29 (the full tree plus max scarabs) with 3.30 (the full tree). The share that survives decides whether a
          scarab is kept, weaker or gone.
        </li>
        <li>
          <b>Surpassing Chance</b> counts as one guaranteed instance per 100%, with the rest as the chance for one more. 610% means 6 guaranteed and
          a 10% chance for a 7th.
        </li>
        <li>Pick-one notables count with their best option. Repeated small nodes count as if you took all of them.</li>
        <li>
          Strategies are recalculated for the number of scarabs you actually use. Scarabs whose content now comes from Threads or an Allflame
          Ember, or that only became a chance, are shown but not scored.
        </li>
      </ul>

      <h2>What to keep in mind</h2>
      <ul>
        <li>
          Most of this is about the Atlas tree. Where the patch notes moved a scarab's effect somewhere else, the scarab says so: three are now
          Allflame Embers, a few can roll as Rare Map suffixes, and other relevant Endgame changes are noted on the scarab.
        </li>
        <li>Base spawn rates of content and the random Thread modifiers aren't modelled, only what the tree and scarabs add.</li>
        <li>
          Which node replaces which scarab effect is a judgment call. Every pairing is listed with its numbers on the Scarab fates page, and the build
          flags new notables that resemble a scarab.
        </li>
        <li>
          Every data correction is listed in the <a href="#/changelog">changelog</a>. Spotted a mistake?{' '}
          <a href={REPORT_URL} target="_blank" rel="noopener noreferrer">
            Report it on GitHub
          </a>
          .
        </li>
      </ul>

      <h2>Sources</h2>
      <ul>
        <li>
          Atlas trees and art:{' '}
          <a href="https://github.com/grindinggear/atlastree-export" target="_blank" rel="noopener noreferrer">
            grindinggear/atlastree-export
          </a>
          , {meta.old.label} (<span className="mono">{meta.old.commit.slice(0, 7)}</span>) and {meta.new.label} (
          <span className="mono">{meta.new.commit.slice(0, 7)}</span>).
        </li>
        <li>
          Endgame changes:{' '}
          <a href="https://www.pathofexile.com/forum/view-thread/4013680" target="_blank" rel="noopener noreferrer">
            3.30.0 patch notes
          </a>
          .
        </li>
        <li>
          Scarab effects, limits and icons:{' '}
          <a href="https://www.poewiki.net/wiki/Scarab" target="_blank" rel="noopener noreferrer">
            poewiki.net
          </a>{' '}
          (CC BY-NC-SA 3.0).
        </li>
        <li>
          Code:{' '}
          <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
            github.com/zenisor/poe-atlas-diff
          </a>
          . Built with AI assistance (Claude Code).
        </li>
      </ul>

      <h2>Privacy</h2>
      <p>
        Visits and clicks are counted with GoatCounter, without cookies or personal data. Nothing you type is recorded. Your strategies are stored
        only in your browser.
      </p>
      <p className="muted">Fan-made and non-commercial. Not affiliated with or endorsed by Grinding Gear Games. Path of Exile and its art © Grinding Gear Games.</p>
    </article>
  );
}
