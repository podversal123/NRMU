"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";

export type FanItem = { id: number; title: string; short: string; count: string; href: string };

/** Where a card sits for its distance from the centre card: sideways, down, tilt and size. Beyond two steps it is hidden. */
const SLOT: Record<number, { x: number; y: number; r: number; s: number }> = {
  0: { x: 0, y: 0, r: 0, s: 1 },
  1: { x: 232, y: 34, r: 6, s: 0.94 },
  2: { x: 385, y: 104, r: 15, s: 0.88 },
};

const STAGE_W = 1160;
const CARD_W = 280;
const CARD_H = 420;

/**
 * The meeting kinds as a fan of cards: the one in the middle is open to read and click, the rest lean away on both sides.
 * Drag, swipe, click a side card, use the arrows or the arrow keys to turn the fan. It goes round, so every kind is reachable.
 */
export default function MeetingFan({ items, open }: { items: FanItem[]; open: string }) {
  const n = items.length;
  const [active, setActive] = useState(0);
  const [scale, setScale] = useState(1);
  const wrap = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; moved: boolean } | null>(null);

  // the whole fan is drawn 1160px wide and scaled down to fit a narrow screen
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const fit = () => setScale(Math.min(1, el.clientWidth / STAGE_W));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const go = (by: number) => setActive((a) => (((a + by) % n) + n) % n);
  // the shortest way round: -2..2 for five or more cards
  const dist = (i: number) => {
    let d = (((i - active) % n) + n) % n;
    if (d > n / 2) d -= n;
    return d;
  };

  const onDown = (e: React.PointerEvent) => {
    drag.current = { x: e.clientX, moved: false };
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.moved) return;
    const dx = e.clientX - d.x;
    if (Math.abs(dx) > 60) {
      d.moved = true;
      go(dx < 0 ? 1 : -1);
    }
  };
  const onUp = () => {
    // keep "moved" a moment longer so the click that ends a drag does not open the card
    const d = drag.current;
    drag.current = null;
    if (d?.moved) suppress.current = true;
    setTimeout(() => (suppress.current = false), 0);
  };
  const suppress = useRef(false);

  if (!n) return null;
  return (
    <div className="relative">
      <div
        ref={wrap}
        role="group"
        aria-roledescription="carousel"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") go(1);
          if (e.key === "ArrowLeft") go(-1);
        }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        className="relative mx-auto w-full max-w-[1160px] cursor-grab touch-pan-y select-none overflow-hidden rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-signal active:cursor-grabbing"
        style={{ height: (CARD_H + 200) * scale }}
      >
        <div className="absolute left-0 top-0 origin-top-left" style={{ width: STAGE_W, height: CARD_H + 200, transform: `scale(${scale})` }}>
          {items.map((it, i) => {
            const d = dist(i);
            const slot = SLOT[Math.abs(d)];
            const sign = d < 0 ? -1 : 1;
            const visible = !!slot;
            const s = slot ?? SLOT[2];
            const style: React.CSSProperties = {
              width: CARD_W,
              height: CARD_H,
              left: STAGE_W / 2 - CARD_W / 2,
              top: 20,
              zIndex: 10 - Math.abs(d),
              opacity: visible ? 1 : 0,
              pointerEvents: visible ? "auto" : "none",
              transform: `translate(${sign * s.x}px, ${s.y}px) rotate(${sign * s.r}deg) scale(${s.s})`,
            };
            const face = (
              <>
                <span className="absolute -right-6 top-10 select-none text-[9rem] font-black leading-none text-white/[0.07]" aria-hidden>
                  {it.short}
                </span>
                <span className="absolute right-4 top-4 rounded-full bg-white px-4 py-1.5 text-sm font-extrabold uppercase tracking-wider text-ink shadow">{it.short}</span>
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 via-black/25 to-transparent px-6 pb-6 pt-24 text-left">
                  <span className="block text-2xl font-bold leading-tight text-white">{it.title}</span>
                  <span className="mt-2 block text-sm italic text-white/80">{it.count}</span>
                  {d === 0 && (
                    <span className="mt-3 inline-flex items-center gap-2 font-semibold text-signal">
                      {open} <Icon name="arrow" size={18} />
                    </span>
                  )}
                </span>
                {d !== 0 && <span className="absolute inset-0 bg-black/35" />}
              </>
            );
            const cls = "absolute block overflow-hidden rounded-2xl bg-gradient-to-br from-brand via-brand to-brand-deep shadow-2xl transition-[transform,opacity] duration-500 ease-out motion-reduce:transition-none";
            return d === 0 ? (
              <Link key={it.id} href={it.href} draggable={false} onClick={(e) => suppress.current && e.preventDefault()} className={cls} style={style}>
                {face}
              </Link>
            ) : (
              <button key={it.id} type="button" tabIndex={visible ? 0 : -1} aria-label={it.title} onClick={() => !suppress.current && setActive(i)} className={cls} style={style}>
                {face}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-2 flex items-center justify-center gap-5">
        <button type="button" onClick={() => go(-1)} aria-label={items[(active - 1 + n) % n].title} className="grid h-11 w-11 place-items-center rounded-full border border-line bg-white text-brand shadow-sm transition hover:shadow-md">
          <Icon name="arrow" size={18} className="rotate-180" />
        </button>
        <div className="flex items-center gap-2" aria-hidden>
          {items.map((it, i) => (
            <span key={it.id} className={`h-2 rounded-full transition-all ${i === active ? "w-6 bg-brand" : "w-2 bg-line"}`} />
          ))}
        </div>
        <button type="button" onClick={() => go(1)} aria-label={items[(active + 1) % n].title} className="grid h-11 w-11 place-items-center rounded-full border border-line bg-white text-brand shadow-sm transition hover:shadow-md">
          <Icon name="arrow" size={18} />
        </button>
      </div>
    </div>
  );
}
