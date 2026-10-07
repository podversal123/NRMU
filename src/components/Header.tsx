"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";

type Item = { href: string; label: string };

export default function Header({
  lang,
  org,
  orgShort,
  tagline,
  items,
  join,
  search,
}: {
  lang: string;
  org: string;
  orgShort: string;
  tagline: string;
  items: Item[];
  join: string;
  search: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === `/${lang}` ? pathname === href : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-40 border-b-4 border-brand bg-white/95 shadow-sm backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
        <Link href={`/${lang}`} className="flex items-center gap-3" aria-label={org}>
          <Image
            src="/logo.jpg"
            alt=""
            width={56}
            height={56}
            priority
            className="h-12 w-12 rounded-full ring-2 ring-ink sm:h-14 sm:w-14"
          />
          <span className="leading-tight">
            <span className="block font-display text-2xl font-extrabold tracking-tight text-ink sm:text-[1.7rem]">
              {orgShort}
            </span>
            <span className="block max-w-[11rem] text-[0.7rem] font-semibold uppercase tracking-wider text-muted sm:max-w-none sm:text-xs">
              {tagline}
            </span>
          </span>
        </Link>

        <nav aria-label="Primary" className="ml-auto hidden items-center gap-0.5 xl:flex">
          {items.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              aria-current={isActive(it.href) ? "page" : undefined}
              className={`relative rounded-md px-3 py-2 text-[0.95rem] font-semibold transition hover:bg-paper ${
                isActive(it.href) ? "text-brand" : "text-ink"
              }`}
            >
              {it.label}
              {isActive(it.href) && (
                <span className="absolute inset-x-3 -bottom-0.5 h-[3px] rounded bg-brand" />
              )}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 xl:ml-3">
          <Link
            href={`/${lang}/orders`}
            aria-label={search}
            className="grid h-10 w-10 place-items-center rounded-full border border-line text-ink transition hover:border-ink hover:bg-ink hover:text-white"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          </Link>
          <Link
            href={`/${lang}/join`}
            className="hidden rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-white shadow-[0_3px_0_var(--red-deep)] transition hover:translate-y-px hover:shadow-[0_2px_0_var(--red-deep)] sm:inline-block"
          >
            {join}
          </Link>
          <button
            className="grid h-10 w-10 place-items-center rounded-md border border-line xl:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label="Menu"
            onClick={() => setOpen((o) => !o)}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" fill="none">
              {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <nav id="mobile-nav" aria-label="Mobile" className="border-t border-line bg-white xl:hidden">
          <ul className="mx-auto grid max-w-7xl gap-1 px-4 py-3 sm:px-6">
            {items.map((it) => (
              <li key={it.href}>
                <Link
                  href={it.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-md px-3 py-3 text-base font-semibold hover:bg-paper"
                >
                  {it.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href={`/${lang}/join`}
                onClick={() => setOpen(false)}
                className="mt-1 block rounded-md bg-brand px-3 py-3 text-center font-bold text-white"
              >
                {join}
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
