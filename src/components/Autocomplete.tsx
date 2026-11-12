import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { SearchEntry, SearchHit } from '../lib/search.ts';
import { rank } from '../lib/search.ts';
import type { NodeKind } from '../lib/types.ts';
import { KIND_LABEL } from '../searchIndex.ts';
import { ItemIcon, MechanicIcon, NodeIcon } from './art.tsx';

function EntryArt({ entry }: { entry: SearchEntry }) {
  const a = entry.art;
  if (!a) return <span className="ac-art" />;
  return (
    <span className="ac-art">
      {a.type === 'scarab' && <ItemIcon name={a.name} size={28} />}
      {a.type === 'mechanic' && <MechanicIcon mechanic={a.mechanic} size={28} />}
      {a.type === 'node' && <NodeIcon version={a.version} kind={a.kind as NodeKind} icon={a.icon} size={a.kind === 'small' ? 24 : 30} />}
    </span>
  );
}

function Highlight({ text, match }: { text: string; match?: [number, number] }) {
  if (!match) return <>{text}</>;
  return (
    <>
      {text.slice(0, match[0])}
      <mark>{text.slice(match[0], match[1])}</mark>
      {text.slice(match[1])}
    </>
  );
}

/**
 * Search input with an autocomplete dropdown.
 * - Typing calls `onChange` (pages keep filtering live as before).
 * - Picking a suggestion (click / Enter) calls `onSelect`.
 * - `hotkey` focuses the input from anywhere ('/' for the global search).
 */
export function Autocomplete({
  entries,
  value,
  onChange,
  onSelect,
  placeholder,
  hotkey,
  limit = 10,
  className,
  focusSignal,
}: {
  entries: SearchEntry[];
  value: string;
  onChange: (v: string) => void;
  onSelect: (hit: SearchHit) => void;
  placeholder?: string;
  hotkey?: string;
  limit?: number;
  className?: string;
  /** Changing this number focuses the input (e.g. when a mobile search row opens). */
  focusSignal?: number;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const hits = useMemo(() => rank(entries, value, limit), [entries, value, limit]);

  useEffect(() => setActive(0), [value]);
  useEffect(() => {
    if (focusSignal) inputRef.current?.focus();
  }, [focusSignal]);

  useEffect(() => {
    if (!hotkey) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
      if (e.key === hotkey && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hotkey]);

  const choose = (hit: SearchHit | undefined) => {
    if (!hit) return;
    onSelect(hit);
    setOpen(false);
    inputRef.current?.blur();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, hits.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      if (open && hits.length) {
        e.preventDefault();
        choose(hits[active]);
      }
    } else if (e.key === 'Escape') {
      if (open) setOpen(false);
      else onChange('');
    }
  };

  const showList = open && value.trim().length > 0;
  return (
    <div className={`ac${className ? ' ' + className : ''}`}>
      <input
        ref={inputRef}
        type="search"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
      />
      {hotkey && !value && <kbd className="ac-kbd">{hotkey}</kbd>}
      {showList && (
        <ul className="ac-list" id={listId} role="listbox">
          {hits.map((h, i) => (
            <li
              key={h.entry.id}
              role="option"
              aria-selected={i === active}
              className={i === active ? 'active' : ''}
              onMouseEnter={() => setActive(i)}
              // mousedown (not click) so the input's blur doesn't close the list first
              onMouseDown={(e) => {
                e.preventDefault();
                choose(h);
              }}
            >
              <EntryArt entry={h.entry} />
              <span className="ac-text">
                <span className="ac-label">
                  <Highlight text={h.entry.label} match={h.match} />
                </span>
                {h.entry.sub && <span className="ac-sub">{h.entry.sub}</span>}
              </span>
              <span className={`ac-kind k-${h.entry.kind}`}>{KIND_LABEL[h.entry.kind]}</span>
            </li>
          ))}
          {!hits.length && <li className="ac-empty">No matches</li>}
        </ul>
      )}
    </div>
  );
}
