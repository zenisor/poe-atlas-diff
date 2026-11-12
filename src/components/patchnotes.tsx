import { patchNotes, patchNotesFor } from '../data.ts';
import { MechIcon } from './tips.tsx';

/**
 * 3.30 changes outside the Atlas tree for the given mechanics, paraphrased from the
 * patch notes. With `showMechanics`, each line names the mechanics it is about.
 */
export function PatchNotes({ mechanics, showMechanics = false }: { mechanics: string[]; showMechanics?: boolean }) {
  const notes = patchNotesFor(mechanics);
  if (!notes.length) return null;
  const relevant = new Set(mechanics);
  return (
    <div className="patch-notes">
      <ul>
        {notes.map((n) => (
          <li key={n.text}>
            {showMechanics && (
              <span className="pn-mech">
                {n.mechanics
                  .filter((m) => relevant.has(m))
                  .map((m) => (
                    <MechIcon key={m} mechanic={m} size={18} />
                  ))}
              </span>
            )}
            <span>{n.text}</span>
          </li>
        ))}
      </ul>
      <p className="small muted">
        Paraphrased from the{' '}
        <a href={patchNotes.url} target="_blank" rel="noopener noreferrer">
          3.30.0 patch notes
        </a>
        .
      </p>
    </div>
  );
}
