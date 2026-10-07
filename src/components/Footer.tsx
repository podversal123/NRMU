import Image from "next/image";
import Link from "next/link";
import { getDict, type Lang } from "@/lib/i18n";
import { divisions } from "@/lib/site";

const YEAR = new Date().getFullYear();

export default function Footer({ lang }: { lang: Lang }) {
  const t = getDict(lang);
  const nav = [
    { href: `/${lang}/orders`, label: t.nav.orders },
    { href: `/${lang}/officials`, label: t.nav.officials },
    { href: `/${lang}/divisions`, label: t.nav.divisions },
    { href: `/${lang}/women`, label: t.nav.women },
    { href: `/${lang}/youth`, label: t.nav.youth },
    { href: `/${lang}/gallery`, label: t.nav.gallery },
  ];

  return (
    <footer className="relative mt-24 bg-ink text-white">
      <div className="track absolute inset-x-0 top-0" />
      <div className="mx-auto grid max-w-7xl gap-10 px-4 pb-10 pt-16 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div>
          <div className="flex items-center gap-3">
            <Image src="/logo.jpg" alt="" width={64} height={64} className="h-16 w-16 rounded-full ring-2 ring-white/30" />
            <div>
              <p className="font-display text-2xl font-extrabold">{t.orgShort}</p>
              <p className="text-sm text-white/70">{t.org}</p>
            </div>
          </div>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/70">{t.footerAbout}</p>
        </div>

        <div>
          <h2 className="font-display text-sm font-bold uppercase tracking-widest text-signal">{t.footerExplore}</h2>
          <ul className="mt-4 space-y-2.5 text-[0.95rem]">
            {nav.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="text-white/80 hover:text-white hover:underline">
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="font-display text-sm font-bold uppercase tracking-widest text-signal">{t.nav.divisions}</h2>
          <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 text-[0.95rem] md:grid-cols-1">
            {divisions.map((d) => (
              <li key={d.slug}>
                <Link href={`/${lang}/divisions/${d.slug}`} className="text-white/80 hover:text-white hover:underline">
                  {lang === "hi" ? d.hi : d.en}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="font-display text-sm font-bold uppercase tracking-widest text-signal">{t.footerContact}</h2>
          <address className="mt-4 space-y-3 text-[0.95rem] not-italic text-white/80">
            <p>{lang === "hi" ? "नई दिल्ली, भारत" : "New Delhi, India"}</p>
            <p>
              <a href="https://www.airfindia.org" className="underline-offset-2 hover:underline">
                AIRF — airfindia.org
              </a>
            </p>
          </address>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-5 text-xs text-white/55 sm:px-6">
          <p>
            © {YEAR} {t.org}. {t.copyright}
          </p>
          <p>nrmu.net</p>
        </div>
      </div>
    </footer>
  );
}
