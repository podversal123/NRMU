"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";

/**
 * A row of cards that scrolls sideways: a swipe on phones, arrow buttons on wider screens. The buttons switch off at
 * either end. Cards snap into place, so a swipe never stops half way through one.
 */
export default function StripScroller({ children, prev, next, label }: { children: React.ReactNode; prev: string; next: string; label: string }) {
  const row = useRef<HTMLUListElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });

  useEffect(() => {
    const el = row.current;
    if (!el) return;
    const check = () => {
      // in right-to-left languages scrollLeft runs from 0 down to negative numbers
      const x = Math.abs(el.scrollLeft);
      setEdge({ start: x < 8, end: x + el.clientWidth >= el.scrollWidth - 8 });
    };
    check();
    el.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => {
      el.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, []);

  const move = (dir: 1 | -1) => {
    const el = row.current;
    if (!el) return;
    const card = el.querySelector("li");
    const step = (card?.getBoundingClientRect().width ?? 280) + 16;
    const rtl = getComputedStyle(el).direction === "rtl" ? -1 : 1;
    el.scrollBy({ left: dir * rtl * step, behavior: "smooth" });
  };

  const btn = "hidden size-11 place-items-center rounded-full border border-line bg-white text-ink shadow-[0_4px_14px_-8px_rgba(21,22,26,0.4)] disabled:pointer-events-none disabled:opacity-35 sm:grid";
  return (
    <div className="relative">
      <ul ref={row} aria-label={label} className="-mx-5 flex snap-x snap-mandatory items-stretch gap-4 overflow-x-auto scroll-px-5 px-5 pb-4 [scrollbar-width:none] sm:-mx-8 sm:scroll-px-8 sm:px-8 [&::-webkit-scrollbar]:hidden">
        {children}
      </ul>
      <div className="mt-1 flex justify-end gap-2">
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
  );
}
