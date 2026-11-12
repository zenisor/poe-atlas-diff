import type { ReactNode } from 'react';
import changelog from '../../CHANGELOG.md?raw';
import { scarabsById } from '../data.ts';
import { ScarabIcon } from '../components/tips.tsx';

/**
 * Renders CHANGELOG.md (the repo file is the single source). Supports the small
 * markdown subset it uses: #/##/### headings, paragraphs, "- " lists with one
 * nested level, **bold**, `code` and [links](url).
 *
 * Links to the live site become in-app links, and links to a scarab row show the
 * scarab's icon with its tooltip, so each change can be inspected in place.
 */
const SITE = 'https://zenisor.github.io/poe-atlas-diff/';

/** Date of the newest entry, e.g. "12 November 2026". */
export const LAST_UPDATED = /^## (.+?)(?::|$)/m.exec(changelog)?.[1] ?? '';

function Link({ href, children }: { href: string; children: ReactNode }) {
  const local = href.startsWith(SITE) ? href.slice(SITE.length) : null;
  if (local == null) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  }
  const scarabId = /^#\/scarabs\/[^?]*\?focus=([\w]+)$/.exec(local)?.[1];
  const scarab = scarabId ? scarabsById.get(scarabId) : undefined;
  if (!scarab) return <a href={local}>{children}</a>;
  return (
    <span className="cl-scarab">
      <ScarabIcon s={scarab} size={24} />
      <a href={local}>{children}</a>
    </span>
  );
}

function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|`([^`]+)`/g;
  let last = 0;
  for (let m; (m = re.exec(text)); ) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1] != null) out.push(<Link key={m.index} href={m[2]}>{m[1]}</Link>);
    else if (m[3] != null) out.push(<b key={m.index}>{m[3]}</b>);
    else out.push(<code key={m.index}>{m[4]}</code>);
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

type Item = { text: string; children: string[] };
type Block = { kind: 'h1' | 'h2' | 'h3' | 'p'; text: string } | { kind: 'ul'; items: Item[] };

function parse(md: string): Block[] {
  const blocks: Block[] = [];
  for (const line of md.split('\n')) {
    const heading = /^(#{1,3}) (.*)$/.exec(line);
    const item = /^( *)- (.*)$/.exec(line);
    const prev = blocks[blocks.length - 1];
    if (heading) blocks.push({ kind: (['h1', 'h2', 'h3'] as const)[heading[1].length - 1], text: heading[2] });
    else if (item) {
      const list = prev?.kind === 'ul' ? prev : (blocks[blocks.push({ kind: 'ul', items: [] }) - 1] as Extract<Block, { kind: 'ul' }>);
      if (item[1].length >= 2 && list.items.length) list.items[list.items.length - 1].children.push(item[2]);
      else list.items.push({ text: item[2], children: [] });
    } else if (line.trim()) {
      if (prev?.kind === 'p' && prev.text) prev.text += ' ' + line.trim();
      else blocks.push({ kind: 'p', text: line.trim() });
    } else if (prev && !(prev.kind === 'p' && !prev.text)) blocks.push({ kind: 'p', text: '' }); // paragraph break
  }
  return blocks.filter((b) => b.kind !== 'p' || b.text);
}

const BLOCKS = parse(changelog);

export function Changelog() {
  return (
    <article className="about changelog">
      {BLOCKS.map((b, i) => {
        if (b.kind === 'ul') {
          return (
            <ul key={i}>
              {b.items.map((it, j) => (
                <li key={j}>
                  {inline(it.text)}
                  {it.children.length > 0 && (
                    <ul>
                      {it.children.map((c, k) => (
                        <li key={k}>{inline(c)}</li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          );
        }
        const Tag = b.kind;
        return <Tag key={i}>{inline(b.text)}</Tag>;
      })}
    </article>
  );
}
