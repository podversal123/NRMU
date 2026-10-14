"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import type { BoardItem } from "./DivisionBoard";
import { DEVANAGARI, PHOTOS, StationDrawing } from "./DivisionCards";

type Labels = { secretary: string; president: string; branches: string; branchSecretaries: string; next: string; previous: string };

const SHOWN = 3; // cards peeking out behind the top one
const FLING = 90; // pixels a card has to be dragged before it flies off

/**
 * Home page divisions as a deck of cards. The top card can be dragged sideways (or clicked) to send it to the back,
 * the next and previous buttons and the arrow keys step through the deck, and the list of names beside it jumps
 * straight to a division. The round arrow on each card opens that division's page.
 */
export default function DivisionDeck({ items, labels }: { items: BoardItem[]; labels: Labels }) {
  const n = items.length;
  const [active, setActive] = useState(0);
  const [leaving, setLeaving] = useState<{ index: number; dir: number; pulled: boolean } | null>(null);
  const [drag, setDrag] = useState(0);
  const press = useRef<{ x: number; id: number; moved: boolean } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // the old top card flies off to the side, then slips in at the back. After a drag it simply carries on; after a
  // click, a button or a name it first gets pulled aside like a drag (the deck-fling keyframes), then flies.
  const go = useCallback(
    (to: number, dir: number, dragged = false) => {
      const next = ((to % n) + n) % n;
      if (next === active) return;
      setLeaving({ index: active, dir, pulled: !dragged });
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setLeaving(null), dragged ? 450 : 700);
      setActive(next);
      setDrag(0);
    },
    [active, n],
  );
  const step = (by: number) => go(active + by, by > 0 ? -1 : 1);

  const onDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("a")) return;
    press.current = { x: e.clientX, id: e.pointerId, moved: false };
  };
  const onMove = (e: React.PointerEvent) => {
    const p = press.current;
    if (!p) return;
    const dx = e.clientX - p.x;
    if (!p.moved && Math.abs(dx) > 5) {
      p.moved = true;
      (e.currentTarget as HTMLElement).setPointerCapture(p.id);
    }
    if (p.moved) setDrag(dx);
  };
  const onUp = () => {
    const p = press.current;
    press.current = null;
    if (!p) return;
    if (!p.moved) return step(1); // a plain click sends the card to the back
    if (Math.abs(drag) > FLING) go(active + 1, Math.sign(drag), true);
    else setDrag(0);
  };

  if (n === 0) return null;

  return (
    <div
      className="grid gap-8 lg:grid-cols-[minmax(0,34rem)_minmax(0,1fr)] lg:gap-16"
      role="region"
      aria-roledescription="carousel"
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") step(1);
        if (e.key === "ArrowLeft") step(-1);
      }}
    >
      {/* the deck */}
      <div className="relative">
        <div className="deck-stage">
          {items.map((d, i) => {
            const k = (i - active + n) % n; // 0 = on top
            const isLeaving = leaving?.index === i;
            const photo = PHOTOS[d.href.split("/").pop() ?? ""];
            const hindi = DEVANAGARI.test(d.name) ? d.name : d.other;
            const english = DEVANAGARI.test(d.name) ? d.other : d.name;
            const depth = Math.min(k, SHOWN);
            const tilt = k === 0 ? drag * 0.04 : (k % 2 ? 1 : -1) * depth * 1.6;
            const style: React.CSSProperties = isLeaving
              ? leaving.pulled
                ? ({ "--dir": leaving.dir, zIndex: n + 1 } as React.CSSProperties)
                : { transform: `translateX(${leaving.dir * 115}%) rotate(${leaving.dir * 14}deg)`, opacity: 0, zIndex: n + 1 }
              : {
                  transform: `translateX(${k === 0 ? drag : depth * 10}px) translateY(${depth * 16}px) scale(${1 - depth * 0.045}) rotate(${tilt}deg)`,
                  opacity: k > SHOWN ? 0 : 1,
                  zIndex: n - k,
                  filter: `brightness(${1 - depth * 0.07})`,
                  transition: k === 0 && drag !== 0 ? "none" : undefined,
                };
            return (
              <article
                key={d.href}
                className={`deck-card ${isLeaving && leaving.pulled ? "deck-fling" : ""} ${k === 0 ? "cursor-grab active:cursor-grabbing" : "pointer-events-none"}`}
                style={style}
                aria-hidden={k !== 0}
                inert={k !== 0}
                onPointerDown={k === 0 ? onDown : undefined}
                onPointerMove={k === 0 ? onMove : undefined}
                onPointerUp={k === 0 ? onUp : undefined}
                onPointerCancel={k === 0 ? () => ((press.current = null), setDrag(0)) : undefined}
              >
                <div className="relative aspect-[5/2] select-none">
                  <div className="absolute inset-0 overflow-hidden bg-[#f6efe2] text-brand/25" title={photo ? `Photo: ${photo.credit}` : undefined}>
                    {photo ? (
                      <Image src={photo.src} alt="" fill draggable={false} sizes="(min-width: 1024px) 48rem, 100vw" className="object-cover" />
                    ) : (
                      <StationDrawing />
                    )}
                  </div>
                  <div className="absolute inset-x-0 bottom-0 z-10 flex translate-y-1/2 justify-center px-4">
                    <div className="min-w-[46%] rounded-[3px] border-2 border-brand-deep bg-[#f6c90e] px-6 py-1.5 text-center text-brand-deep shadow-[0_8px_16px_-10px_rgba(111,26,23,0.8)]">
                      {hindi && <p className="text-[1.5rem] font-bold leading-tight">{hindi}</p>}
                      {english && <h3 className="text-[0.8rem] font-bold uppercase leading-tight tracking-[0.12em]">{english}</h3>}
                    </div>
                  </div>
                </div>
                {/* details: the president and the secretary side by side, then the branch and branch secretary counts beside the link to the division */}
                <div className="px-5 pb-6 pt-12 sm:px-7">
                  <dl className="grid gap-4 sm:grid-cols-2 sm:gap-6">
                    {[
                      [labels.president, d.president],
                      [labels.secretary, d.secretary],
                    ].map(([label, name]) => (
                      <div key={label} className="min-w-0">
                        <dt className="text-[0.72rem] uppercase tracking-[0.1em] text-muted">{label}</dt>
                        <dd className="mt-1 truncate text-[1.3rem] font-semibold leading-snug text-ink" title={name || undefined}>
                          {name || " "}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <div className="mt-5 flex items-end justify-between gap-4 border-t border-line pt-4">
                    <dl className="flex gap-7 sm:gap-10">
                      <div>
                        <dt className="text-[0.72rem] uppercase tracking-[0.1em] text-muted">{labels.branches}</dt>
                        <dd className="mt-1 text-[1.9rem] font-bold leading-none tabular-nums text-brand">{d.branches}</dd>
                      </div>
                      <div>
                        <dt className="text-[0.72rem] uppercase tracking-[0.1em] text-muted">{labels.branchSecretaries}</dt>
                        <dd className="mt-1 text-[1.9rem] font-bold leading-none tabular-nums text-brand">{d.secretaries}</dd>
                      </div>
                    </dl>
                    <Link
                      href={d.href}
                      aria-label={english || hindi}
                      className="grid size-12 shrink-0 place-items-center rounded-full bg-brand text-lg text-white transition hover:bg-brand-deep"
                    >
                      →
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
        <p className="sr-only" aria-live="polite">
          {items[active].name} {active + 1} / {n}
        </p>
      </div>

      {/* names and controls */}
      <div className="flex flex-col gap-6 lg:self-center">
        <div className="flex items-center justify-between gap-4 lg:order-2 lg:max-w-sm">
          <button type="button" onClick={() => step(-1)} aria-label={labels.previous} className="deck-nav">
            ←
          </button>
          <p className="font-mono text-lg tabular-nums text-light/60">
            <b className="text-2xl text-signal">{String(active + 1).padStart(2, "0")}</b> / {String(n).padStart(2, "0")}
          </p>
          <button type="button" onClick={() => step(1)} aria-label={labels.next} className="deck-nav">
            →
          </button>
        </div>
        <ul className="flex flex-wrap gap-2 lg:order-1 lg:grid lg:grid-cols-2 lg:gap-x-10 lg:gap-y-0.5">
          {items.map((d, i) => (
            <li key={d.href}>
              <button
                type="button"
                onClick={() => go(i, i > active ? -1 : 1)}
                aria-current={i === active}
                className={`deck-name ${i === active ? "is-active" : ""}`}
              >
                {d.name}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
