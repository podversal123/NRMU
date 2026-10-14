"use client";

import Link from "next/link";
import { useRef, useState } from "react";

export type BoardItem = { href: string; name: string; other: string; secretary: string; president: string; branches: string; secretaries: string };

/**
 * A featured panel for one division beside a list of all of them. Pointing at (or tapping) a row
 * shows that division in the panel; the panel links through to the division page.
 */
export default function DivisionBoard({
  items,
  labels,
}: {
  items: BoardItem[];
  labels: { secretary: string; branches: string; branchSecretaries: string };
}) {
  const [active, setActive] = useState(0);
  const panel = useRef<HTMLDivElement>(null);
  const d = items[active];
  if (!d) return null;

  // On phones the panel sits above the list, so bring it back into view after a tap.
  const choose = (i: number, reveal = false) => {
    setActive(i);
    if (reveal && panel.current && panel.current.getBoundingClientRect().top < 0) {
      panel.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="grid overflow-hidden rounded-md border border-line lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <div ref={panel} className="scroll-mt-24 bg-ink text-light" aria-live="polite">
        <div key={active} className="swap-in flex h-full flex-col p-7 sm:p-9">
          <h3 className="text-3xl font-semibold leading-tight sm:text-[2.25rem]">{d.name}</h3>
          {d.other && <p className="mt-1 text-lg text-soft/70">{d.other}</p>}

          <dl className="mt-7 divide-y divide-white/10 border-y border-white/10">
            {d.secretary && (
              <div className="flex items-baseline justify-between gap-6 py-3">
                <dt className="text-light/60">{labels.secretary}</dt>
                <dd className="text-right font-medium">{d.secretary}</dd>
              </div>
            )}
            <div className="flex items-baseline justify-between gap-6 py-3">
              <dt className="text-light/60">{labels.branches}</dt>
              <dd className="font-medium tabular-nums">{d.branches}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-6 py-3">
              <dt className="text-light/60">{labels.branchSecretaries}</dt>
              <dd className="font-medium tabular-nums">{d.secretaries}</dd>
            </div>
          </dl>

          <div className="mt-auto pt-8">
            <Link
              href={d.href}
              className="group flex items-center justify-between rounded-md border border-white/20 px-4 py-3 font-medium transition-colors hover:border-signal hover:text-signal"
            >
              {d.name}
              <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="bg-white">
        <p aria-hidden className="flex justify-end border-b border-line bg-paper/50 px-5 py-2 text-xs font-medium text-muted sm:px-6">{labels.branches}</p>
        <ul>
          {items.map((it, i) => {
            const on = i === active;
            return (
              <li key={it.href} className="border-b border-line last:border-b-0">
                <button
                  type="button"
                  aria-pressed={on}
                  onMouseEnter={() => choose(i)}
                  onFocus={() => choose(i)}
                  onClick={() => choose(i, true)}
                  className={`flex w-full items-baseline justify-between gap-4 px-5 py-3 text-left transition-colors sm:px-6 ${on ? "bg-paper" : "hover:bg-paper/60"}`}
                >
                  <span className={`truncate ${on ? "font-semibold text-brand" : "font-medium text-ink"}`}>
                    {it.name}
                    {it.other && <span className="ml-2 text-sm font-normal text-muted">{it.other}</span>}
                  </span>
                  <span className={`tabular-nums ${on ? "font-semibold text-brand" : "text-muted"}`}>{it.branches}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
