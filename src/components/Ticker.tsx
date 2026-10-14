import Link from "next/link";

export type TickerItem = { href: string; text: string; date: string };

/**
 * A strip of the newest orders that moves slowly in a continuous loop. It stops while the pointer or
 * keyboard focus is on it.
 */
export default function Ticker({ label, items }: { label: string; items: TickerItem[] }) {
  if (!items.length) return null;
  // The row is drawn twice so the strip loops without a gap; the copy is hidden from screen readers and Tab.
  const row = (hidden: boolean) => (
    <ul className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {items.map((it) => (
        <li key={it.href} className="flex shrink-0 items-center">
          <Link href={it.href} tabIndex={hidden ? -1 : undefined} className="inline-flex min-h-11 items-center gap-2 px-5 text-[0.95rem] hover:text-brand hover:underline">
            <span className="rounded-sm bg-paper px-2 py-0.5 text-[0.8rem] font-semibold text-brand">{it.date}</span>
            <span>{it.text}</span>
          </Link>
          <span aria-hidden className="h-1.5 w-1.5 rotate-45 bg-signal" />
        </li>
      ))}
    </ul>
  );
  return (
    <div className="ticker print-chrome border-b border-line bg-white">
      <div className="mx-auto flex max-w-wrap items-stretch px-5 sm:px-8">
        {/* the tag and its arrow tip are one shape, so no seam shows between them. A white shape inside a
            maroon one of the same outline draws the thin border, which a CSS border cannot do around the clipped tip. */}
        <span className="flex shrink-0 bg-brand p-[1.5px] [clip-path:polygon(0_0,calc(100%-0.75rem)_0,100%_50%,calc(100%-0.75rem)_100%,0_100%)]">
          <span className="flex items-center gap-2 bg-white pl-4 pr-6 text-sm font-bold uppercase tracking-wide text-brand [clip-path:polygon(0_0,calc(100%-0.75rem)_0,100%_50%,calc(100%-0.75rem)_100%,0_100%)]">
            <span aria-hidden className="live-dot h-2 w-2 rounded-full bg-brand" />
            {label}
          </span>
        </span>
        <div className="ticker-view min-w-0 flex-1 overflow-hidden">
          <div className="ticker-track">
            {row(false)}
            {row(true)}
          </div>
        </div>
      </div>
    </div>
  );
}
