"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { LANGUAGES, type Lang } from "@/lib/i18n";

const PREFIX = new RegExp(`^/(${LANGUAGES.map((l) => l.code).join("|")})(?=/|$)`);

/** Language chooser in the utility bar: the current language, opening a list of every language in its own script. */
export default function LanguageMenu({ lang }: { lang: Lang }) {
  const pathname = usePathname();
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt === pathname; // closes by itself on the next page
  const ref = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const current = LANGUAGES.find((l) => l.code === lang)!;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpenAt(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpenAt(null);
      button.current?.focus();
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls="language-list"
        onClick={() => setOpenAt(open ? null : pathname)}
        className="flex h-[44px] items-center gap-1.5 px-2 font-semibold text-light hover:text-signal sm:px-3 lg:h-auto lg:px-2 lg:py-0.5"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden className="text-signal">
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
        </svg>
        <span lang={lang}>{current.native}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden className={`transition-transform ${open ? "rotate-180" : ""}`}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <ul
          id="language-list"
          className="absolute end-0 top-full z-[60] mt-1 max-h-[70vh] w-60 overflow-y-auto overscroll-contain border border-line bg-white text-sm text-ink shadow-[0_18px_36px_-18px_rgba(0,0,0,0.55)] [scrollbar-color:var(--line)_transparent] [scrollbar-width:thin]"
        >
          {LANGUAGES.map((l) => (
            <li key={l.code}>
              <a
                href={pathname.replace(PREFIX, `/${l.code}`)}
                hrefLang={l.code}
                aria-current={l.code === lang ? "true" : undefined}
                onClick={() => {
                  document.cookie = `nrmu-lang=${l.code}; path=/; max-age=31536000`;
                }}
                className={`group flex items-baseline justify-between gap-3 whitespace-nowrap px-4 py-2 hover:bg-brand hover:text-white ${l.code === lang ? "font-bold text-brand" : ""}`}
              >
                <span lang={l.code}>{l.native}</span>
                {l.code !== "en" && <span className="text-xs font-normal text-muted group-hover:text-white/80">{l.name}</span>}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
