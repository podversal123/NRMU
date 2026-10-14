"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { TEXT_SIZES } from "@/lib/text-size";

type Child = { href: string; label: string; children?: Child[] };
export type MenuNode = { id: number; href: string; label: string; children: Child[] };
type Labels = {
  skip: string; textSize: string; textSmaller: string; textDefault: string; textLarger: string; textContrast: string;
  menu: string; search: string; langSwitch: string; navPrimary: string; navMobile: string; memberLogin: string;
};

const SIZES = TEXT_SIZES;
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
  orgAltShort,
  menu,
  join,
  labels,
}: {
  lang: "en" | "hi";
  orgName: string;
  orgAltName: string;
  orgShort: string;
  orgAltShort: string;
  menu: MenuNode[];
  join: string;
  labels: Labels;
}) {
  const pathname = usePathname();
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt === pathname; // a menu opened on one page is closed on the next
  const setOpen = (v: boolean | ((o: boolean) => boolean)) =>
    setOpenAt((cur) => ((typeof v === "function" ? v(cur === pathname) : v) ? pathname : null));
  // Desktop sub-menus: one at a time. A click keeps one open until the next click, Escape, a click elsewhere or a page change;
  // a mouse resting on a heading opens it for as long as the pointer stays.
  const [sub, setSub] = useState<{ id: number; path: string; by: "click" | "hover" } | null>(null);
  const openSub = sub && sub.path === pathname ? sub : null;
  const navRef = useRef<HTMLUListElement>(null);
  // Phone menu: an accordion, one section at a time.
  const [mobileSub, setMobileSub] = useState<{ id: number; path: string } | null>(null);
  const openMobileSub = mobileSub && mobileSub.path === pathname ? mobileSub.id : null;
  const closeSub = () => setSub(null);
  // Third level (a dropdown item with its own items): opens on hover or keyboard focus through CSS, or by tapping its arrow.
  const [flyout, setFlyout] = useState<string | null>(null);
  const [size, setSize] = useState(1);
  // Page breakpoints are fixed in screen pixels, but text can be made larger. The full menu needs the room of a 1024px
  // screen at normal text, so with larger text it switches to the compact menu on wider screens too.
  const [compact, setCompact] = useState(false);
  const [contrast, setContrast] = useState(false);
  const [atFooter, setAtFooter] = useState(false);
  const [now, setNow] = useState<Date | null>(null);

  // The clock shows seconds, so tick on each whole second rather than drifting with a plain interval.
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const tick = () => {
      const d = new Date();
      setNow(d);
      t = setTimeout(tick, 1000 - d.getMilliseconds());
    };
    tick();
    return () => clearTimeout(t);
  }, []);

  // Normal size (100%) unless the visitor chose another one; a missing saved value must not mean "smallest".
  useEffect(() => {
    const raw = read("nrmu-size");
    const s = raw === null ? NaN : Number(raw);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (Number.isInteger(s) && s >= 0 && s < SIZES.length) setSize(s);
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setContrast(read("nrmu-contrast") === "1");
  }, []);
  const toggleContrast = () => {
    const next = !contrast;
    setContrast(next);
    if (next) document.documentElement.setAttribute("data-contrast", "high");
    else document.documentElement.removeAttribute("data-contrast");
    write("nrmu-contrast", next ? "1" : "0");
  };
  const choose = (next: number) => {
    const n = Math.min(SIZES.length - 1, Math.max(0, next));
    setSize(n);
    document.documentElement.style.setProperty("--user-scale", String(SIZES[n]));
    write("nrmu-size", String(n));
  };
  useEffect(() => {
    document.documentElement.style.setProperty("--user-scale", String(SIZES[size]));
  }, [size]);
  useLayoutEffect(() => {
    const check = () => {
      // text size chosen by the visitor times the size the screen itself asks for (see globals.css)
      const screenScale = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--screen-scale")) || 1;
      const scale = (SIZES[size] / 100) * screenScale;
      setCompact(window.innerWidth / scale < 1024);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [size]);

  useEffect(() => {
    const footer = document.getElementById("site-footer");
    if (!footer) return;
    const io = new IntersectionObserver(([e]) => setAtFooter(e.isIntersecting), { threshold: 0.2 });
    io.observe(footer);
    return () => io.disconnect();
  }, [pathname]);

  useEffect(() => {
    if (!openSub && !open) return;
    const onDown = (e: PointerEvent) => {
      if (openSub && navRef.current && !navRef.current.contains(e.target as Node)) setSub(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (openSub) {
        navRef.current?.querySelector<HTMLElement>(`[data-sub="${openSub.id}"]`)?.focus();
        setSub(null);
      }
      if (open) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openSub?.id, open]);

  const other = lang === "en" ? "hi" : "en";
  const swapped = pathname.replace(/^\/(en|hi)(?=\/|$)/, `/${other}`);
  const full = (href: string) => `/${lang}${href}`;
  const isActive = (href: string) => {
    if (href === "#") return false;
    const p = href.split("?")[0];
    return p === "" ? pathname === `/${lang}` : pathname.startsWith(full(p));
  };
  const sizeBtn = "grid h-[44px] min-w-[44px] place-items-center px-1 text-xs font-semibold text-light/85 hover:text-signal lg:h-6 lg:min-w-6";
  const locale = lang === "hi" ? "hi-IN" : "en-IN";
  const dateText = now ? new Intl.DateTimeFormat(locale, { dateStyle: "full", timeZone: "Asia/Kolkata" }).format(now) : "";
  const timeText = now ? new Intl.DateTimeFormat(locale, { timeStyle: "medium", timeZone: "Asia/Kolkata" }).format(now) : "";

  return (
    <>
      {/* 1. utility bar: always pinned, so text size, contrast and language stay in reach */}
      <div className="print-chrome sticky top-0 z-50 border-b border-white/10 bg-ink text-light">
        <div className="mx-auto flex h-11 max-w-wrap items-center justify-between gap-3 px-5 text-xs sm:px-8 lg:h-9">
          <div className="flex items-center gap-5">
            <a href="#main" className="sr-only font-medium text-soft underline-offset-2 hover:underline focus:not-sr-only sm:not-sr-only">
              {labels.skip}
            </a>
            {now && (
              <span className="hidden items-center gap-3 md:flex">
                <span className="flex items-center gap-2 text-light/75">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden className="text-signal">
                    <rect x="3" y="5" width="18" height="16" rx="2" />
                    <path d="M3 10h18M8 3v4M16 3v4" />
                  </svg>
                  {dateText}
                </span>
                <span aria-hidden className="h-3.5 w-px bg-white/25" />
                <span className="flex items-center gap-1.5">
                  <time dateTime={now.toISOString()} className="font-mono tabular-nums text-soft">
                    {timeText}
                  </time>
                  <span className="text-[0.65rem] font-semibold text-light/45">IST</span>
                </span>
              </span>
            )}
          </div>
          <div className="ml-auto flex items-center gap-0.5 lg:gap-1.5">
            <span className="hidden text-light/70 sm:inline">{labels.textSize}</span>
            <button className={`${sizeBtn} disabled:opacity-35`} aria-label={labels.textSmaller} disabled={size === 0} onClick={() => choose(size - 1)}>
              A−
            </button>
            <button className={`${sizeBtn} ${size === 1 ? "text-signal" : ""}`} aria-label={labels.textDefault} aria-pressed={size === 1} onClick={() => choose(1)}>
              A
            </button>
            <button className={`${sizeBtn} disabled:opacity-35`} aria-label={labels.textLarger} disabled={size === SIZES.length - 1} onClick={() => choose(size + 1)}>
              A+
            </button>
            <button className={`${sizeBtn} ${contrast ? "text-signal" : ""}`} aria-label={labels.textContrast} aria-pressed={contrast} title={labels.textContrast} onClick={toggleContrast}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <circle cx="12" cy="12" r="9" />
                <path d="M12 3v18a9 9 0 0 0 0-18z" fill="currentColor" />
              </svg>
            </button>
            <span className="mx-0.5 h-3.5 w-px bg-white/25 sm:mx-1.5" />
            <a
              href={swapped}
              hrefLang={other}
              onClick={() => {
                document.cookie = `nrmu-lang=${other}; path=/; max-age=31536000`;
              }}
              className="grid h-[44px] place-items-center px-2 font-semibold text-light hover:text-signal sm:px-3 lg:h-auto lg:px-2 lg:py-0.5"
            >
              {labels.langSwitch}
            </a>
          </div>
        </div>
      </div>

      {/* 2. organisation name */}
      <div className="print-chrome border-b border-line bg-white">
        <div className="mx-auto flex max-w-wrap items-center justify-between gap-6 px-5 py-4 sm:px-8">
          <Link href={`/${lang}`} className="flex items-center gap-4" aria-label={orgName}>
            <Image src="/logo.jpg" alt="" width={72} height={72} priority className="h-14 w-14 rounded-full sm:h-[4.5rem] sm:w-[4.5rem]" />
            <span className="leading-tight">
              <b className="block text-[1.3rem] font-bold sm:text-[1.85rem]">{orgName} ({orgShort})</b>
              <span className="block text-sm text-muted sm:text-base">{orgAltName} ({orgAltShort})</span>
            </span>
          </Link>
          <div className={`hidden shrink-0 items-center gap-3 ${compact ? "" : "lg:flex"}`}>
            <Link href={full("/member")} className="btn-outline inline-flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21a8 8 0 0 1 16 0" />
              </svg>
              {labels.memberLogin}
            </Link>
            <Link href={full("/join")} className="btn-primary inline-block">
              {join}
            </Link>
          </div>
          <span className="sr-only">{orgShort}</span>
        </div>
      </div>

      {/* 3. menu bar */}
      <nav
        aria-label={labels.navPrimary}
        className={`print-chrome sticky top-11 z-40 bg-ink lg:top-9 text-light transition-transform duration-300 ${atFooter && !open ? "-translate-y-full" : "translate-y-0"}`}
      >
        <div className="mx-auto flex max-w-wrap items-center justify-between px-5 sm:px-8">
          <ul ref={navRef} className={`hidden items-stretch ${compact ? "" : "lg:flex"}`}>
            {menu.map((m, mi) => {
              const kids = m.children.length > 0;
              const isOpen = openSub?.id === m.id;
              const active = isActive(m.href) || m.children.some((c) => isActive(c.href) || (c.children ?? []).some((g) => isActive(g.href)));
              const tab = `flex h-12 items-center gap-1.5 border-b-2 text-[0.95rem] font-medium hover:text-soft focus-visible:text-soft ${active || isOpen ? "border-signal text-soft" : "border-transparent"}`;
              const toggle = () => setSub(isOpen && openSub?.by === "click" ? null : { id: m.id, path: pathname, by: "click" });
              return (
                <li
                  key={m.id}
                  className="relative"
                  onPointerEnter={(e) => {
                    if (e.pointerType === "mouse" && kids) setSub({ id: m.id, path: pathname, by: "hover" });
                  }}
                  onPointerLeave={(e) => {
                    if (e.pointerType === "mouse" && sub?.by === "hover") closeSub();
                  }}
                  onBlur={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setSub((cur) => (cur?.id === m.id ? null : cur));
                  }}
                >
                  {!kids ? (
                    <Link href={full(m.href)} aria-current={isActive(m.href) ? "page" : undefined} className={`${tab} px-4`}>
                      {m.label}
                    </Link>
                  ) : m.href === "#" ? (
                    <button type="button" data-sub={m.id} aria-expanded={isOpen} onClick={toggle} className={`${tab} px-4`}>
                      {m.label}
                      <Caret open={isOpen} />
                    </button>
                  ) : (
                    <div className="flex items-stretch">
                      <Link href={full(m.href)} aria-current={isActive(m.href) ? "page" : undefined} className={`${tab} pl-4 pr-1`}>
                        {m.label}
                      </Link>
                      <button type="button" data-sub={m.id} aria-label={m.label} aria-expanded={isOpen} onClick={toggle} className={`${tab} pl-1 pr-3`}>
                        <Caret open={isOpen} />
                      </button>
                    </div>
                  )}
                  {kids && isOpen && (
                    <ul className={`absolute ${mi >= menu.length - 2 ? "right-0" : "left-0"} top-full z-50 min-w-[16rem] border border-line border-t-2 border-t-signal bg-white py-2 text-ink shadow-[0_12px_28px_rgba(0,0,0,0.18)]`}>
                      {m.children.map((c) =>
                        c.children?.length ? (
                          <li key={c.href} className="group/fly relative" onPointerLeave={() => setFlyout(null)}>
                            <div className="flex items-stretch hover:bg-paper">
                              <Link href={full(c.href)} onClick={closeSub} className="block flex-1 whitespace-nowrap py-2.5 pl-5 pr-2 text-[0.95rem] hover:text-brand">
                                {c.label}
                              </Link>
                              <button
                                type="button"
                                aria-label={c.label}
                                aria-expanded={flyout === c.href}
                                onClick={() => setFlyout(flyout === c.href ? null : c.href)}
                                className="grid w-10 shrink-0 place-items-center text-muted hover:text-brand"
                              >
                                <Caret side />
                              </button>
                            </div>
                            <ul
                              className={`absolute top-0 ${mi >= menu.length - 2 ? "right-full" : "left-full"} z-50 -mt-2 min-w-[16rem] border border-line border-t-2 border-t-signal bg-white py-2 shadow-[0_12px_28px_rgba(0,0,0,0.18)] ${flyout === c.href ? "block" : "hidden group-hover/fly:block group-focus-within/fly:block"}`}
                            >
                              {c.children.map((g) => (
                                <li key={g.href}>
                                  <Link href={full(g.href)} onClick={closeSub} className="block whitespace-nowrap px-5 py-2.5 text-[0.95rem] hover:bg-paper hover:text-brand">
                                    {g.label}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          </li>
                        ) : (
                          <li key={c.href}>
                            <Link href={full(c.href)} onClick={closeSub} className="block px-5 py-2.5 text-[0.95rem] hover:bg-paper hover:text-brand">
                              {c.label}
                            </Link>
                          </li>
                        ),
                      )}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>

          <button
            className={`flex h-12 items-center gap-2 text-[0.95rem] font-medium ${compact ? "" : "lg:hidden"}`}
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
            <Link href={full("/join")} className={`btn-gold !px-3 !py-2.5 text-sm sm:!px-4 ${compact ? "" : "lg:hidden"}`}>
              {join}
            </Link>
          </div>
        </div>

        {open && (
          <div id="mobile-nav" aria-label={labels.navMobile} className={`max-h-[calc(100svh-5.75rem)] overflow-y-auto overscroll-contain border-t border-[#2b2d33] ${compact ? "" : "lg:hidden"}`}>
            <ul className="mx-auto max-w-wrap px-5 pb-5 sm:px-8">
              {menu.map((m) => (
                <li key={m.id} className="border-b border-[#2b2d33]">
                  {m.children.length === 0 ? (
                    <Link href={full(m.href)} onClick={() => setOpen(false)} className="block py-3.5 text-[1.05rem]">
                      {m.label}
                    </Link>
                  ) : (
                    <>
                      <button
                        type="button"
                        aria-expanded={openMobileSub === m.id}
                        onClick={() => setMobileSub(openMobileSub === m.id ? null : { id: m.id, path: pathname })}
                        className="flex w-full items-center justify-between py-3.5 text-left text-[1.05rem]"
                      >
                        {m.label}
                        <Caret open={openMobileSub === m.id} />
                      </button>
                      {openMobileSub === m.id && (
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
                              {!!c.children?.length && (
                                <ul className="pl-4">
                                  {c.children.map((g) => (
                                    <li key={g.href}>
                                      <Link href={full(g.href)} onClick={() => setOpen(false)} className="block py-2 text-light/70">
                                        {g.label}
                                      </Link>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  )}
                </li>
              ))}
              <li className="border-b border-[#2b2d33]">
                <Link href={full("/member")} onClick={() => setOpen(false)} className="block py-3.5 text-[1.05rem]">
                  {labels.memberLogin}
                </Link>
              </li>
            </ul>
          </div>
        )}
      </nav>
    </>
  );
}

/** `side` points the caret at a flyout that opens to the side. */
function Caret({ open = false, side = false }: { open?: boolean; side?: boolean }) {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden className={`transition-transform ${open ? "rotate-180" : side ? "-rotate-90" : ""}`}>
      <path d="m2 3.5 3 3 3-3" />
    </svg>
  );
}
