"use client";

import Link from "next/link";
import { useState } from "react";

export type TickerItem = { href: string; text: string; date: string };

/**
 * A strip of the newest orders that moves slowly. It stops when the pointer or keyboard is on it, has its own
 * pause button, and stays still (and scrolls by hand) for visitors who prefer reduced motion.
 */
export default function Ticker({ label, items, pause, play }: { label: string; items: TickerItem[]; pause: string; play: string }) {
  const [paused, setPaused] = useState(false);
  if (!items.length) return null;
  const row = (hidden: boolean) => (
    <ul className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {items.map((it) => (
        <li key={it.href} className="flex shrink-0 items-center">
          <Link href={it.href} tabIndex={hidden ? -1 : undefined} className="inline-flex min-h-11 items-center gap-2 px-5 text-[0.95rem] hover:text-brand hover:underline">
            <span className="font-semibold text-brand">{it.date}</span>
            <span>{it.text}</span>
          </Link>
          <span aria-hidden className="text-line">|</span>
        </li>
      ))}
    </ul>
  );
  return (
    <div className="ticker print-chrome border-b border-line bg-white" data-paused={paused}>
      <div className="mx-auto flex max-w-wrap items-stretch px-5 sm:px-8">
        <span className="flex shrink-0 items-center bg-brand px-4 text-sm font-bold uppercase tracking-wide text-white">{label}</span>
        <div className="ticker-view min-w-0 flex-1 overflow-hidden">
          <div className="ticker-track">
            {row(false)}
            {row(true)}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          aria-pressed={paused}
          aria-label={paused ? play : pause}
          className="grid h-11 w-11 shrink-0 place-items-center border-l border-line hover:bg-paper"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            {paused ? <path d="M7 4v16l13-8z" /> : <path d="M6 4h4v16H6zM14 4h4v16h-4z" />}
          </svg>
        </button>
      </div>
    </div>
  );
}
