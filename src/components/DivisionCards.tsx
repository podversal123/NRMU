import Link from "next/link";
import Image from "next/image";
import type { BoardItem } from "./DivisionBoard";
import Reveal from "./Reveal";

// Station building photos from Wikimedia Commons (free licences that ask for a credit). Keyed by division
// slug; a division without one gets a drawn station front instead.
export const PHOTOS: Record<string, { src: string; credit: string }> = {
  headquarter: { src: "/divisions/headquarter.jpg", credit: "Ramesh Lalwani, CC BY-SA 4.0" },
  delhi: { src: "/divisions/delhi-entry.jpg", credit: "Anjalipapreja, CC BY-SA 4.0" },
  ambala: { src: "/divisions/ambala.jpg", credit: "ArmouredCyborg, CC BY-SA 4.0" },
  firozpur: { src: "/divisions/firozpur-board.jpg", credit: "Sid Sharma5911, CC BY 4.0" },
  lucknow: { src: "/divisions/lucknow-day.jpg", credit: "Santulan Mahanta, CC BY 2.0" },
  moradabad: { src: "/divisions/moradabad-gate.jpg", credit: "J Ansari, CC BY-SA 4.0" },
  workshop: { src: "/divisions/workshop.jpg", credit: "Santulan Mahanta, CC BY 2.0" },
  bridge: { src: "/divisions/bridge.jpg", credit: "Konkan Railway Corporation, GODL-India" },
  accounts: { src: "/divisions/accounts.jpg", credit: "Pinakpani, CC BY-SA 4.0" },
  jammu: { src: "/divisions/jammu.jpg", credit: "Sid Sharma5911, CC BY 4.0" },
};

export const DEVANAGARI = /[ऀ-ॿ]/;

/** A simple station front (arches, clock tower, flag) for divisions that have no photo yet. */
export function StationDrawing() {
  return (
    <svg aria-hidden viewBox="0 0 320 200" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMax meet">
      <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
        <path d="M20 182 H300" />
        <path d="M40 182 V112 H280 V182" />
        <path d="M30 112 H290" />
        <path d="M138 112 V62 H182 V112" />
        <path d="M132 62 H188 L160 40 Z" />
        <circle cx="160" cy="84" r="11" />
        <path d="M160 84 V77 M160 84 H166" />
        <path d="M160 40 V22 M160 22 H176 V30 H160" />
        {[62, 98, 206, 242].map((x) => (
          <path key={x} d={`M${x} 182 V146 a12 12 0 0 1 24 0 V182`} />
        ))}
        <path d="M144 182 V140 a16 16 0 0 1 32 0 V182" />
      </g>
    </svg>
  );
}

/**
 * Home page divisions: two columns of cards (one on phones). Each card is a wide station photo with a
 * yellow Indian Railways name board (Hindi over English) across its lower edge, and under it the
 * divisional secretary and the branch count. The cards rise in one after another the first time the
 * section scrolls into view.
 */
export default function DivisionCards({
  items,
  labels,
}: {
  items: BoardItem[];
  labels: { secretary: string; branches: string; branchSecretaries: string };
}) {
  if (items.length === 0) return null;
  return (
    <Reveal>
      <ul className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:gap-6">
        {items.map((d, i) => {
          const photo = PHOTOS[d.href.split("/").pop() ?? ""];
          const hindi = DEVANAGARI.test(d.name) ? d.name : d.other;
          const english = DEVANAGARI.test(d.name) ? d.other : d.name;
          return (
            <li key={d.href} style={{ "--i": i } as React.CSSProperties}>
              <Link
                href={d.href}
                className="group flex h-full flex-col overflow-hidden rounded-lg bg-white shadow-[0_2px_8px_-4px_rgba(111,26,23,0.25)] ring-1 ring-line transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_38px_-20px_rgba(111,26,23,0.5)] hover:ring-2 hover:ring-signal motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                <div className="relative aspect-[5/2]">
                  {/* the photo credit the licence asks for shows as a tooltip, not on the picture */}
                  <div className="absolute inset-0 overflow-hidden bg-[#f6efe2] text-brand/25" title={photo ? `Photo: ${photo.credit}` : undefined}>
                    {photo ? (
                      <Image src={photo.src} alt="" fill sizes="(min-width: 768px) 36rem, 100vw" className="object-cover" />
                    ) : (
                      <StationDrawing />
                    )}
                  </div>
                  <div className="absolute inset-x-0 bottom-0 z-10 flex translate-y-1/2 justify-center px-4">
                    <div className="min-w-[46%] rounded-[3px] border-2 border-brand-deep bg-[#f6c90e] px-5 py-1 text-center text-brand-deep shadow-[0_8px_16px_-10px_rgba(111,26,23,0.8)]">
                      {hindi && <p className="text-[1.3rem] font-bold leading-tight">{hindi}</p>}
                      {english && <h3 className="text-[0.75rem] font-bold uppercase leading-tight tracking-[0.12em]">{english}</h3>}
                    </div>
                  </div>
                </div>

                <div className="flex flex-1 items-end justify-between gap-3 px-4 pb-4 pt-10 sm:gap-4 sm:px-5">
                  <div className="min-w-0">
                    <p className="text-[0.72rem] uppercase tracking-[0.08em] text-muted">{labels.secretary}</p>
                    <p className="truncate text-[1.1rem] font-semibold text-ink" title={d.secretary || undefined}>
                      {d.secretary || " "}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="rounded-full bg-[#f7efdc] px-3 py-1 text-[0.82rem] text-brand-deep ring-1 ring-soft">
                      <b className="mr-1 font-bold tabular-nums text-brand">{d.branches}</b>
                      {labels.branches}
                    </span>
                    <span
                      aria-hidden
                      className="hidden size-9 place-items-center rounded-full border border-brand/25 sm:grid text-brand transition duration-300 group-hover:translate-x-0.5 group-hover:border-brand group-hover:bg-brand group-hover:text-white motion-reduce:transition-none"
                    >
                      →
                    </span>
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </Reveal>
  );
}
