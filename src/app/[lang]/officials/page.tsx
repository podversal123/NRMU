import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PHOTOS } from "@/components/DivisionCards";
import Icon from "@/components/Icon";
import PageHero from "@/components/PageHero";
import { getOfficeBearerParts } from "@/lib/content";
import { intlLocale, isLang } from "@/lib/i18n";
import { navTitle } from "@/lib/nav";
import { getSettings, getUi, setting } from "@/lib/queries";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return { title: isLang(lang) ? await navTitle(lang, "/officials") : undefined };
}

/** The Office Bearers front page: three parts, each opening its own page. */
export default async function OfficialsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const [ui, s, title, parts] = await Promise.all([getUi(lang), getSettings(), navTitle(lang, "/officials"), getOfficeBearerParts()]);
  const t = (k: string) => setting(s, k, lang);
  const branchCount = parts.divisions.reduce((n, d) => n + d.branches.length, 0);
  const cards = [
    { href: "/officials/central", photo: PHOTOS.headquarter, title: t("officials.card.central"), sub: t("officials.central.sub"), count: parts.central.length, unit: t("officials.unit.people") },
    { href: "/officials/divisional", photo: PHOTOS.bridge, title: t("officials.card.divisional"), sub: t("officials.divisional.sub"), count: parts.divisions.length, unit: t("officials.unit.divisions") },
    { href: "/officials/branch", photo: PHOTOS.jammu, title: t("officials.card.branch"), sub: t("officials.branch.sub"), count: branchCount, unit: t("officials.unit.branches") },
  ] as const;
  return (
    <>
      <PageHero lang={lang} title={title} sub={t("officials.sub")} crumbs={[{ href: `/${lang}`, label: ui.home }, { label: title }]} />
      <div className="mx-auto max-w-wrap px-5 py-12 sm:px-8 sm:py-14">
        <ul className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {cards.map((c) => (
            <li key={c.href}>
              <Link href={`/${lang}${c.href}`} className="group flex h-full flex-col overflow-hidden rounded-lg border border-line bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
                {/* the photo credit the licence asks for shows as a tooltip, not on the picture */}
                <div className="relative h-44 bg-brand-deep" title={`Photo: ${c.photo.credit}`}>
                  <div className="absolute inset-0 overflow-hidden">
                    <Image src={c.photo.src} alt="" fill sizes="(min-width: 768px) 24rem, 100vw" className="object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/0 to-black/0" />
                  </div>
                  <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border-4 border-white bg-signal px-4 py-1 text-sm font-bold text-ink">
                    {c.count.toLocaleString(intlLocale(lang))} {c.unit}
                  </span>
                </div>
                <div className="flex flex-1 flex-col px-6 pb-6 pt-10 text-center sm:px-7 sm:pb-7">
                  <h2 className="text-xl font-semibold leading-snug">{c.title}</h2>
                  <p className="mt-2 text-muted">{c.sub}</p>
                  <span className="mx-auto mt-auto inline-flex min-h-11 items-center gap-2 pt-4 font-medium text-brand">
                    {t("officials.open")} <Icon name="arrow" size={18} className="transition group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
