/** Minimal line icons (instead of text glyphs like ☰ ⌕ ✕ ▾). */
const paths = {
  menu: 'M3 5h14M3 10h14M3 15h14',
  search: 'M8.5 3a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11zM12.5 12.5 17 17',
  close: 'M5 5l10 10M15 5 5 15',
  down: 'M5 8l5 5 5-5',
  up: 'M5 12l5-5 5 5',
} as const;

export function Icon({ name, size = 18 }: { name: keyof typeof paths; size?: number }) {
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  );
}
