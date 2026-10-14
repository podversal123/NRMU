"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type Props = {
  short: string;
  name: string;
  altName: string;
  cardTitle: string;
  city: string;
  address: string;
};

/**
 * A landscape membership card on a short lanyard, in the footer's name band. It drops in and swings when the footer
 * comes into view, can be dragged and let go (it swings back like a pendulum), and turns over on a click; a second
 * click turns it back. The back shows the logo and the union's address. For people who ask their device for less
 * motion it does not drop in or move by itself; it still swings when they drag it or turn it over, since they start
 * that themselves.
 */
export default function HangingCard(p: Props) {
  const rig = useRef<HTMLDivElement>(null);
  const [flipped, setFlipped] = useState(false);
  const flippedRef = useRef(false);

  useEffect(() => {
    const el = rig.current;
    if (!el) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let angle = 0; // degrees, 0 = hanging straight down
    let speed = 0; // degrees per frame
    let twist = 0; // a little turn around the vertical axis while swinging
    let drop = still ? 1 : -1; // -1 = waiting above the footer, then falls to 1
    let dragging = false;
    let moved = false;
    let last = { x: 0, grab: 0 };
    let frame = 0;
    let running = false;

    const paint = () => {
      const y = drop < 0 ? -110 : (1 - drop) * -110;
      const turn = (flippedRef.current ? 180 : 0) + twist;
      el.style.transform = `translateY(${y}%) rotate(${angle}deg)`;
      el.style.opacity = drop < 0 ? "0" : String(Math.min(1, drop * 2.5));
      el.style.setProperty("--turn", `${turn}deg`);
    };

    const tick = () => {
      if (drop >= 0 && drop < 1) {
        drop = Math.min(1, drop + 0.045);
        if (drop === 1) speed += 2; // lands with a swing
      }
      if (!dragging) {
        speed += -angle * 0.012; // pull back to the middle
        speed *= 0.965; // air: a swing dies down in about four seconds
        angle += speed;
      }
      twist += (speed * 6 - twist) * 0.08;
      paint();
      const resting = drop === 1 && !dragging && Math.abs(angle) < 0.05 && Math.abs(speed) < 0.01 && Math.abs(twist) < 0.05;
      if (resting) {
        angle = speed = twist = 0;
        paint();
        running = false;
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    const wake = () => {
      if (running) return;
      running = true;
      frame = requestAnimationFrame(tick);
    };

    paint();

    // drop in the first time the footer is on screen
    const seen = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        seen.disconnect();
        if (drop < 0) drop = 0;
        wake();
      },
      { threshold: 0.2 },
    );
    seen.observe(el.parentElement ?? el);

    // drag: the card follows the pointer around the pin at the top of the lanyard
    const pivot = () => {
      const r = el.parentElement!.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top };
    };
    const pointerAngle = (e: PointerEvent) => {
      const c = pivot();
      return (Math.atan2(e.clientX - c.x, e.clientY - c.y) * -180) / Math.PI;
    };
    // a press only becomes a drag once the pointer moves; until then it is a plain click that turns the card over
    let pressed = false;
    const onDown = (e: PointerEvent) => {
      pressed = true;
      moved = false;
      last = { x: e.clientX, grab: pointerAngle(e) - angle };
    };
    let nudged = 0;
    const onMove = (e: PointerEvent) => {
      if (pressed && !dragging && Math.abs(e.clientX - last.x) > 5) {
        dragging = moved = true;
        el.setPointerCapture(e.pointerId);
        wake();
      }
      if (!dragging) {
        // a light push in the direction the pointer moves across the card, at most every 1.2 seconds
        const now = performance.now();
        if (still || pressed || Math.abs(e.movementX) < 3 || now - nudged < 1200) return;
        nudged = now;
        speed += Math.sign(e.movementX) * -0.6;
        wake();
        return;
      }
      const target = Math.max(-60, Math.min(60, pointerAngle(e) - last.grab));
      speed = (target - angle) * 0.5;
      angle = target;
    };
    const onUp = () => {
      pressed = dragging = false;
      wake();
    };
    const onClick = (e: MouseEvent) => {
      if (moved) {
        e.preventDefault();
        e.stopPropagation();
        moved = false;
      }
    };
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    el.addEventListener("click", onClick, true);

    // turning the card over also sets it swinging a little
    const onTurn = () => {
      speed -= 1.2;
      wake();
    };
    el.addEventListener("card-turn", onTurn);

    return () => {
      cancelAnimationFrame(frame);
      seen.disconnect();
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      el.removeEventListener("click", onClick, true);
      el.removeEventListener("card-turn", onTurn);
    };
  }, []);

  const turn = () => {
    const next = !flippedRef.current;
    flippedRef.current = next;
    setFlipped(next);
    rig.current?.style.setProperty("--turn", `${next ? 180 : 0}deg`);
    rig.current?.dispatchEvent(new Event("card-turn"));
  };

  return (
    <div className="hang-wrap">
      <div ref={rig} className="hang-rig">
        {/* lanyard: a woven strap printed with the short name, down to a metal clip */}
        <span aria-hidden className="hang-strap">
          <span>{Array.from({ length: 6 }, () => p.short).join("  •  ")}</span>
        </span>
        <span aria-hidden className="hang-clip" />

        {/* the whole card is one button: each click turns it over, the next turns it back */}
        <button
          type="button"
          onClick={turn}
          aria-pressed={flipped}
          aria-label={`${p.cardTitle}. ${p.address}`}
          className="hang-card"
          style={{ transform: "rotateY(var(--turn, 0deg))" }}
        >
          {/* front: logo and name */}
          <span className="hang-face hang-front">
            <span aria-hidden className="hang-slot" />
            <span className="flex flex-1 items-center gap-4 px-6 pt-4">
              <Image src="/logo.jpg" alt="" width={80} height={80} className="hang-logo h-[4.6rem] w-[4.6rem]" />
              <span aria-hidden className="h-14 w-px shrink-0 bg-gradient-to-b from-transparent via-signal/70 to-transparent" />
              <span className="min-w-0 leading-none">
                <b className={`hang-foil block font-extrabold ${p.short.length > 6 ? "text-[1.45rem]" : "text-[2.1rem] tracking-[0.08em]"}`}>{p.short}</b>
                <span className="mt-2 block text-[0.68rem] font-semibold leading-snug text-white/90">{p.name}</span>
                <span className="mt-0.5 block text-[0.62rem] leading-snug text-soft/75">{p.altName}</span>
              </span>
            </span>
            <span className="hang-band">
              <span>{p.cardTitle}</span>
              <span>{p.city}</span>
            </span>
          </span>

          {/* back: logo and address */}
          <span className="hang-face hang-back">
            <span aria-hidden className="hang-slot" />
            <span className="flex flex-1 flex-col items-center justify-center gap-3 px-8 pt-3 text-center">
              <Image src="/logo.jpg" alt="" width={64} height={64} className="hang-logo h-14 w-14" />
              <span className="text-[0.82rem] font-medium leading-relaxed text-balance text-light/90">{p.address}</span>
            </span>
          </span>
        </button>
      </div>
    </div>
  );
}
