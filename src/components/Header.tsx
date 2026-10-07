"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type Item = { href: string; label: string };
type Labels = { skip: string; textSize: string; textSmaller: string; textDefault: string; textLarger: string; menu: string; search: string; langSwitch: string; navPrimary: string; navMobile: string };

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
 * Fixed header. On the home page it floats transparently over the full-screen banner and turns solid
 * once the page is scrolled; on every other page it is solid. The thin top strip holds accessibility
 * controls (text size) and the language switch.
 */
export default function Header({
  lang,
  orgShort,
  city,
  items,
  join,
  labels,
}: {
  lang: "en" | "hi";
  orgShort: string;
  city: string;
  items: Item[];
  join: string;
  labels: Labels;
}) {
  const pathname = usePathname();
  const isHome = pathname === `/${lang}`;
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [size, setSize] = useState(1);
  const [atFooter, setAtFooter] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // The footer fills the whole screen, so the navigation bar slides away while it is in view.
  useEffect(() => {
    const footer = document.getElementById("site-footer");
    if (!footer) return;
    const io = new IntersectionObserver(([e]) => setAtFooter(e.isIntersecting), { threshold: 0.2 });
    io.observe(footer);
    return () => io.disconnect();
  }, [pathname]);

  useEffect(() => {
    const s = Number(read("nrmu-size"));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (s >= 0 && s < SIZES.length) setSize(s);
  }, []);
  useEffect(() => {
    document.documentElement.style.fontSize = `${SIZES[size]}%`;
    write("nrmu-size", String(size));
  }, [size]);

  const solid = !isHome || scrolled || open;
  const other = lang === "en" ? "hi" : "en";
  const swapped = pathname.replace(/^\/(en|hi)(?=\/|$)/, `/${other}`);
  const isActive = (href: string) => (href === `/${lang}` ? pathname === href : pathname.startsWith(href));
  const sizeBtn = "grid h-6 min-w-6 place-items-center rounded px-1 text-xs font-semibold text-light/80 hover:bg-white/10 hover:text-signal";

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 text-light transition-[background-color,transform] duration-300 ${atFooter && !open ? "-translate-y-full" : "translate-y-0"} ${
        solid ? "border-b border-[#2b2d33] bg-ink/95 backdrop-blur" : "border-b border-transparent bg-gradient-to-b from-ink/90 via-ink/55 to-transparent [text-shadow:0_1px_8px_rgba(0,0,0,0.55)]"
      }`}
    >
      <div className={`overflow-hidden transition-all duration-300 ${scrolled ? "max-h-0 opacity-0" : "max-h-10 opacity-100"}`}>
        <div className="mx-auto flex h-9 max-w-[1320px] items-center justify-between gap-3 px-5 text-xs sm:px-8">
          <a href="#main" className="font-medium text-soft underline-offset-2 hover:underline">
            {labels.skip}
          </a>
          <div className="flex items-center gap-1.5">
            <span className="hidden text-dim sm:inline">{labels.textSize}</span>
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
              className="rounded px-2 py-0.5 font-semibold text-light hover:text-signal"
            >
              {labels.langSwitch}
            </a>
          </div>
        </div>
      </div>

      <div className="mx-auto flex h-[4.25rem] max-w-[1320px] items-center justify-between gap-6 px-5 sm:px-8">
        <Link href={`/${lang}`} className="flex items-center gap-3.5" aria-label={orgShort}>
          <Image src="/logo.jpg" alt="" width={46} height={46} priority className="h-[2.9rem] w-[2.9rem] rounded-full" />
          <span className="leading-none">
            <b className="block font-display text-[1.7rem] font-bold tracking-[0.04em]">{orgShort}</b>
            <small className="mt-1 block text-xs font-medium uppercase tracking-[0.08em] text-soft">{city}</small>
          </span>
        </Link>

        <nav aria-label={labels.navPrimary} className="hidden items-center gap-6 text-[0.95rem] font-medium tracking-[0.02em] min-[1340px]:flex">
          {items.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              aria-current={isActive(it.href) ? "page" : undefined}
              className={`transition ${isActive(it.href) ? "text-soft opacity-100" : "opacity-85 hover:text-soft hover:opacity-100"}`}
            >
              {it.label}
            </Link>
          ))}
          <Link href={`/${lang}/join`} className="rounded-full bg-signal px-5 py-2.5 font-semibold text-ink hover:bg-soft">
            {join}
          </Link>
        </nav>

        <button
          className="grid h-11 w-11 place-items-center rounded-full border border-[#55585e] min-[1340px]:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={labels.menu}
          onClick={() => setOpen((o) => !o)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none">
            {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 8h16M4 16h16" />}
          </svg>
        </button>
      </div>

      {open && (
        <nav id="mobile-nav" aria-label={labels.navMobile} className="border-t border-[#2b2d33] bg-ink min-[1340px]:hidden">
          <ul className="mx-auto max-w-[1180px] px-5 pb-6 pt-2 sm:px-8">
            {items.map((it) => (
              <li key={it.href}>
                <Link href={it.href} onClick={() => setOpen(false)} className="block border-b border-[#2b2d33] py-3.5 text-[1.05rem]">
                  {it.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href={`/${lang}/join`} onClick={() => setOpen(false)} className="mt-5 inline-block rounded-full bg-signal px-6 py-3 font-semibold text-ink">
                {join}
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
