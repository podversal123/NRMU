"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type Child = { href: string; label: string };
export type MenuNode = { id: number; href: string; label: string; children: Child[] };
type Labels = {
  skip: string; textSize: string; textSmaller: string; textDefault: string; textLarger: string;
  menu: string; search: string; langSwitch: string; navPrimary: string; navMobile: string;
};

const SIZES = [92, 100, 112, 125];
const read = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const write = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {}
};

/**
 * Three bands, like a government portal: a thin utility bar (date, text size, language), the
 * organisation name, and a sticky menu bar with dropdowns. The menu bar slides away while the
 * full-screen footer is in view.
 */
export default function Header({
  lang,
  orgName,
  orgAltName,
  orgShort,
  menu,
  join,
  labels,
}: {
  lang: "en" | "hi";
  orgName: string;
  orgAltName: string;
  orgShort: string;
  menu: MenuNode[];
  join: string;
  labels: Labels;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [size, setSize] = useState(1);
  const [atFooter, setAtFooter] = useState(false);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const t = setInterval(tick, 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const s = Number(read("nrmu-size"));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (s >= 0 && s < SIZES.length) setSize(s);
  }, []);
  useEffect(() => {
    document.documentElement.style.fontSize = `${SIZES[size]}%`;
    write("nrmu-size", String(size));
  }, [size]);

  useEffect(() => {
    const footer = document.getElementById("site-footer");
    if (!footer) return;
    const io = new IntersectionObserver(([e]) => setAtFooter(e.isIntersecting), { threshold: 0.2 });
    io.observe(footer);
    return () => io.disconnect();
  }, [pathname]);

  const other = lang === "en" ? "hi" : "en";
  const swapped = pathname.replace(/^\/(en|hi)(?=\/|$)/, `/${other}`);
  const full = (href: string) => `/${lang}${href}`;
  const isActive = (href: string) => {
    if (href === "#") return false;
    const p = href.split("?")[0];
    return p === "" ? pathname === `/${lang}` : pathname.startsWith(full(p));
  };
  const sizeBtn = "grid h-6 min-w-6 place-items-center px-1 text-xs font-semibold text-light/85 hover:text-signal";
  const dateText = now
    ? new Intl.DateTimeFormat(lang === "hi" ? "hi-IN" : "en-IN", { dateStyle: "full", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(now)
    : "";

  return (
    <>
      {/* 1. utility bar */}
      <div className="bg-ink text-light">
        <div className="mx-auto flex h-9 max-w-[1180px] items-center justify-between gap-3 px-5 text-xs sm:px-8">
          <div className="flex items-center gap-5">
            <a href="#main" className="font-medium text-soft underline-offset-2 hover:underline">
              {labels.skip}
            </a>
            <span className="hidden text-light/70 md:inline" suppressHydrationWarning>
              {dateText}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="hidden text-light/70 sm:inline">{labels.textSize}</span>
            <button className={sizeBtn} aria-label={labels.textSmaller} onClick={() => setSize((s) => Math.max(0, s - 1))}>
              A−
            </button>
            <button className={sizeBtn} aria-label={labels.textDefault} onClick={() => setSize(1)}>
              A
            </button>
            <button className={sizeBtn} aria-label={labels.textLarger} onClick={() => setSize((s) => Math.min(SIZES.length - 1, s + 1))}>
              A+
            </button>
            <span className="mx-1.5 h-3.5 w-px bg-white/25" />
            <a
              href={swapped}
              hrefLang={other}
              onClick={() => {
                document.cookie = `nrmu-lang=${other}; path=/; max-age=31536000`;
              }}
              className="px-2 py-0.5 font-semibold text-light hover:text-signal"
            >
              {labels.langSwitch}
            </a>
          </div>
        </div>
      </div>

      {/* 2. organisation name */}
      <div className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-6 px-5 py-4 sm:px-8">
          <Link href={`/${lang}`} className="flex items-center gap-4" aria-label={orgName}>
            <Image src="/logo.jpg" alt="" width={72} height={72} priority className="h-14 w-14 rounded-full sm:h-[4.5rem] sm:w-[4.5rem]" />
            <span className="leading-tight">
              <b className="block font-display text-[1.45rem] font-bold sm:text-[2.1rem]">{orgName}</b>
              <span className="block text-sm text-muted sm:text-base">{orgAltName}</span>
            </span>
          </Link>
          <Link href={full("/join")} className="btn-gold hidden shrink-0 lg:inline-block">
            {join}
          </Link>
          <span className="sr-only">{orgShort}</span>
        </div>
      </div>

      {/* 3. menu bar */}
      <nav
        aria-label={labels.navPrimary}
        className={`sticky top-0 z-40 bg-ink text-light transition-transform duration-300 ${atFooter && !open ? "-translate-y-full" : "translate-y-0"}`}
      >
        <div className="mx-auto flex max-w-[1180px] items-center justify-between px-5 sm:px-8">
          <ul className="hidden items-stretch lg:flex">
            {menu.map((m) => (
              <li key={m.id} className="group relative">
                {m.href === "#" ? (
                  <span tabIndex={0} className="flex h-12 cursor-default items-center gap-1.5 px-4 text-[0.95rem] font-medium hover:text-soft focus:text-soft">
                    {m.label}
                    <Caret />
                  </span>
                ) : (
                  <Link
                    href={full(m.href)}
                    aria-current={isActive(m.href) ? "page" : undefined}
                    className={`flex h-12 items-center gap-1.5 border-b-2 px-4 text-[0.95rem] font-medium hover:text-soft ${isActive(m.href) ? "border-signal text-soft" : "border-transparent"}`}
                  >
                    {m.label}
                    {m.children.length > 0 && <Caret />}
                  </Link>
                )}
                {m.children.length > 0 && (
                  <ul className="invisible absolute left-0 top-full z-50 min-w-[16rem] border border-line bg-white py-2 text-ink opacity-0 transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                    {m.children.map((c) => (
                      <li key={c.href}>
                        <Link href={full(c.href)} className="block px-5 py-2.5 text-[0.95rem] hover:bg-paper hover:text-brand">
                          {c.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>

          <button
            className="flex h-12 items-center gap-2 text-[0.95rem] font-medium lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((o) => !o)}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none" aria-hidden>
              {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
            {labels.menu}
          </button>

          <div className="flex items-center gap-1">
            <Link href={full("/orders")} aria-label={labels.search} className="grid h-12 w-12 place-items-center hover:text-soft">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            </Link>
            <Link href={full("/join")} className="btn-gold !px-4 !py-1.5 text-sm lg:hidden">
              {join}
            </Link>
          </div>
        </div>

        {open && (
          <div id="mobile-nav" aria-label={labels.navMobile} className="border-t border-[#2b2d33] lg:hidden">
            <ul className="mx-auto max-w-[1180px] px-5 pb-5 sm:px-8">
              {menu.map((m) => (
                <li key={m.id} className="border-b border-[#2b2d33]">
                  {m.children.length === 0 ? (
                    <Link href={full(m.href)} onClick={() => setOpen(false)} className="block py-3.5 text-[1.05rem]">
                      {m.label}
                    </Link>
                  ) : (
                    <details>
                      <summary className="flex cursor-pointer list-none items-center justify-between py-3.5 text-[1.05rem]">
                        {m.label}
                        <Caret />
                      </summary>
                      <ul className="pb-3 pl-4">
                        {m.href !== "#" && (
                          <li>
                            <Link href={full(m.href)} onClick={() => setOpen(false)} className="block py-2 text-light/80">
                              {m.label}
                            </Link>
                          </li>
                        )}
                        {m.children.map((c) => (
                          <li key={c.href}>
                            <Link href={full(c.href)} onClick={() => setOpen(false)} className="block py-2 text-light/80">
                              {c.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </nav>
    </>
  );
}

function Caret() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="m2 3.5 3 3 3-3" />
    </svg>
  );
}
