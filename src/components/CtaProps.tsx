"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/**
 * Grievance card: a sealed envelope. Hovering the card lifts the flap a little; a click opens it (the flap turns
 * over, the seal fades) and a letter rises out above the card, linking to the grievance form. A second click,
 * Escape or a click elsewhere closes it again.
 */
export function GrievanceEnvelope({ href, title, short }: { href: string; title: string; short: string }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div ref={box} className={`env ${open ? "is-open" : ""}`}>
      <span aria-hidden className="env-back" />
      <Link href={href} className="env-letter" inert={!open} tabIndex={open ? 0 : -1}>
        <span className="flex items-center gap-1.5">
          <Image src="/logo.jpg" alt="" width={22} height={22} className="h-[1.35rem] w-[1.35rem] rounded-full" />
          <b className="text-[0.62rem] font-extrabold tracking-[0.12em] text-brand-deep">{short}</b>
        </span>
        <span aria-hidden className="env-lines" />
        <span className="env-cta">
          {title}
          <span aria-hidden>→</span>
        </span>
      </Link>
      <span aria-hidden className="env-front" />
      <span aria-hidden className="env-flap">
        <span className="env-seal">
          <Image src="/logo.jpg" alt="" width={26} height={26} className="h-full w-full rounded-full" />
        </span>
      </span>
      <button type="button" className="env-hit" aria-expanded={open} aria-label={title} onClick={() => setOpen((o) => !o)} />
    </div>
  );
}

/**
 * A small train on the rails at the bottom of an action card: a steam engine with smoke on the grievance card, an
 * electric one on the join card. The two take turns on one shared clock (see train-run-a and train-run-b): the steam
 * train crosses its card, then the electric one crosses the next, and round again. Both watch the same section and
 * pause together while it is off screen, so they never fall out of turn.
 */
export function TrackTrain({ kind }: { kind: "steam" | "electric" }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    const section = el?.closest("section");
    if (!el || !section) return;
    const seen = new IntersectionObserver(([e]) => el.classList.toggle("is-paused", !e.isIntersecting));
    seen.observe(section);
    return () => seen.disconnect();
  }, []);

  const wheel = (cx: number, r: number) => (
    <g className="tw-wheel" key={cx}>
      <circle cx={cx} cy={34 - r} r={r} fill="var(--tw-wheel)" />
      <circle cx={cx} cy={34 - r} r={r * 0.62} fill="none" stroke="var(--tw-win)" strokeWidth="0.9" />
      <path d={`M${cx - r * 0.62} ${34 - r}H${cx + r * 0.62}M${cx} ${34 - r * 1.62}V${34 - r * 0.38}`} stroke="var(--tw-win)" strokeWidth="0.9" />
    </g>
  );
  const coach = (x: number) => (
    <g key={x}>
      <rect x={x} y="4" width="54" height="3" rx="1.5" fill="var(--tw-body)" opacity="0.75" />
      <rect x={x} y="7" width="54" height="20" rx="3" fill="var(--tw-body)" />
      {[5, 17, 29, 41].map((d) => (
        <rect key={d} x={x + d} y="11" width="8" height="6" rx="1" fill="var(--tw-win)" />
      ))}
      <rect x={x} y="21" width="54" height="1.4" fill="var(--tw-win)" opacity="0.35" />
      {wheel(x + 10, 3.4)}
      {wheel(x + 44, 3.4)}
    </g>
  );

  return (
    <span ref={ref} aria-hidden className={`act-train act-train-${kind}`}>
      <span className="act-train-body">
        <svg viewBox="0 0 200 34" className="h-full w-full overflow-visible">
          {coach(0)}
          <rect x="54" y="22" width="8" height="2" fill="var(--tw-body)" />
          {coach(62)}
          <rect x="116" y="22" width="8" height="2" fill="var(--tw-body)" />
          {kind === "steam" ? (
            <g>
              <rect x="124" y="4" width="22" height="23" rx="2" fill="var(--tw-body)" />
              <rect x="122" y="2" width="26" height="3" rx="1.5" fill="var(--tw-body)" />
              <rect x="129" y="8" width="11" height="7" rx="1" fill="var(--tw-win)" />
              <rect x="145" y="11" width="42" height="15" rx="7" fill="var(--tw-body)" />
              <rect x="152" y="11" width="2" height="15" fill="var(--tw-win)" opacity="0.35" />
              <rect x="166" y="11" width="2" height="15" fill="var(--tw-win)" opacity="0.35" />
              <circle cx="161" cy="10.5" r="3.6" fill="var(--tw-body)" />
              <rect x="176" y="3" width="7" height="9" fill="var(--tw-body)" />
              <rect x="174" y="1" width="11" height="3" rx="1" fill="var(--tw-body)" />
              <path d="M186 24 L197 31 H186 Z" fill="var(--tw-body)" />
              <circle cx="188" cy="16" r="1.8" fill="var(--tw-win)" />
              {wheel(134, 5.4)}
              {wheel(151, 5.4)}
              {wheel(169, 3.4)}
              {wheel(181, 3.4)}
              <path d="M134 28.6 H151" stroke="var(--tw-win)" strokeWidth="1.3" strokeLinecap="round" />
            </g>
          ) : (
            <g>
              <path d="M131 1 L137 5 L131 9 M137 5 H146" fill="none" stroke="var(--tw-body)" strokeWidth="1.2" strokeLinejoin="round" />
              <path d="M124 9 Q124 6 127 6 H182 Q190 6 194 14 L197 22 Q198 27 193 27 H127 Q124 27 124 24 Z" fill="var(--tw-body)" />
              <path d="M184 9 Q189 10 192 16 H184 Z" fill="var(--tw-win)" />
              {[130, 144, 158, 170].map((d) => (
                <rect key={d} x={d} y="11" width="8" height="6" rx="1" fill="var(--tw-win)" />
              ))}
              <rect x="124" y="20" width="73" height="1.6" fill="var(--tw-win)" opacity="0.4" />
              <circle cx="194" cy="23" r="1.7" fill="var(--gold-soft)" className="tw-lamp" />
              {wheel(134, 3.4)}
              {wheel(144, 3.4)}
              {wheel(176, 3.4)}
              {wheel(186, 3.4)}
            </g>
          )}
        </svg>
        {kind === "steam" && (
          <span className="act-smoke">
            <span />
            <span />
            <span />
            <span />
          </span>
        )}
      </span>
    </span>
  );
}

/**
 * Join card: a leather pocket with an NRMU membership card tucked in. Hovering (or focusing) the join card slides
 * the membership card up out of the pocket; on touch screens it already peeks out. Purely decorative: the join
 * button covers the whole card.
 */
export function MemberPocket({ short, name, cardTitle, city }: { short: string; name: string; cardTitle: string; city: string }) {
  return (
    <div aria-hidden className="pocket">
      <span className="pocket-card">
        <span className="flex items-center gap-2 px-[9%] pt-[11%]">
          <Image src="/logo.jpg" alt="" width={30} height={30} className="h-[1.9rem] w-[1.9rem] shrink-0 rounded-full ring-1 ring-signal" />
          <span className="min-w-0 leading-none">
            <b className="hang-foil block text-[1.05rem] font-extrabold tracking-[0.08em]">{short}</b>
            <span className="mt-[3px] block truncate text-[0.42rem] font-semibold uppercase tracking-[0.08em] text-white/85">{name}</span>
          </span>
        </span>
        <span className="pocket-band">
          <span className="min-w-0 truncate">{cardTitle}</span>
          <span className="shrink-0 whitespace-nowrap">{city}</span>
        </span>
      </span>
      <span className="pocket-front">
        <b>{short}</b>
      </span>
    </div>
  );
}
