"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";

/**
 * A row of cards that scrolls sideways: a swipe on phones, arrow buttons on wider screens. The title sits above it,
 * with the buttons up beside the title. The buttons switch off at either end, and the row fades out softly at an edge
 * while there is more to see past it. Cards snap into place, so a swipe never stops half way through one.
 */
export default function StripScroller({
  children,
  head,
  action,
  prev,
  next,
  label,
}: {
  children: React.ReactNode;
  head: React.ReactNode;
  action?: React.ReactNode;
  prev: string;
  next: string;
  label: string;
}) {
  const row = useRef<HTMLUListElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false, rtl: false });

  useEffect(() => {
    const el = row.current;
    if (!el) return;
    const check = () => {
      // in right-to-left languages scrollLeft runs from 0 down to negative numbers
      const x = Math.abs(el.scrollLeft);
      setEdge({ start: x < 8, end: x + el.clientWidth >= el.scrollWidth - 8, rtl: getComputedStyle(el).direction === "rtl" });
    };
    check();
    el.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => {
      el.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, []);

  // The arrows slide the row themselves rather than asking for a smooth scroll: browsers make that jump at once when
  // the visitor's system has animations off, and the row then seems not to move. The slide only runs on a click, so
  // like the divisions deck it is kept for people who prefer less motion too. Snapping is off while it runs, or the
  // browser would pull the row back to a card on every frame.
  const slide = useRef({ frame: 0, to: 0, busy: false });
  useEffect(() => () => cancelAnimationFrame(slide.current.frame), []);
  const move = (dir: 1 | -1) => {
    const el = row.current;
    if (!el) return;
    const card = el.querySelector("li");
    const step = (card?.getBoundingClientRect().width ?? 280) + 20;
    const rtl = getComputedStyle(el).direction === "rtl" ? -1 : 1;
    const s = slide.current;
    cancelAnimationFrame(s.frame);
    // a second click during a slide carries on from where the first was heading
    const from = el.scrollLeft;
    const max = el.scrollWidth - el.clientWidth;
    const goal = (s.busy ? s.to : from) + dir * rtl * step;
    s.to = rtl === 1 ? Math.min(max, Math.max(0, goal)) : Math.max(-max, Math.min(0, goal));
    s.busy = true;
    el.style.scrollSnapType = "none";
    const start = performance.now();
    const ms = 520;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / ms);
      const ease = 1 - Math.pow(1 - p, 3);
      el.scrollLeft = from + (s.to - from) * ease;
      if (p < 1) s.frame = requestAnimationFrame(tick);
      else {
        s.busy = false;
        el.style.scrollSnapType = "";
      }
    };
    s.frame = requestAnimationFrame(tick);
  };

  // the fade is on the left and right in screen terms, so in right-to-left languages start and end swap sides
  const [left, right] = edge.rtl ? [edge.end, edge.start] : [edge.start, edge.end];
  const mask = `linear-gradient(to right, transparent, #000 ${left ? "0rem" : "3rem"}, #000 calc(100% - ${right ? "0rem" : "3rem"}), transparent)`;
  const btn =
    "hidden size-11 place-items-center rounded-full border border-line bg-white text-ink transition-colors hover:border-brand hover:text-brand disabled:pointer-events-none disabled:opacity-35 sm:grid";
  return (
    <div>
      <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
        {head}
        <div className="flex items-center gap-2">
          {action}
          <button type="button" onClick={() => move(-1)} disabled={edge.start} aria-label={prev} className={btn}>
            <span className="rotate-180 rtl:rotate-0">
              <Icon name="arrow" size={18} />
            </span>
          </button>
          <button type="button" onClick={() => move(1)} disabled={edge.end} aria-label={next} className={btn}>
            <Icon name="arrow" size={18} />
          </button>
        </div>
      </div>
      <ul
        ref={row}
        aria-label={label}
        style={{ maskImage: mask, WebkitMaskImage: mask }}
        className="-mx-5 flex snap-x snap-mandatory items-stretch gap-5 overflow-x-auto scroll-px-5 px-5 pb-6 pt-1 [scrollbar-width:none] sm:-mx-8 sm:scroll-px-8 sm:px-8 [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </ul>
    </div>
  );
}
