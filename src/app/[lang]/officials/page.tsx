import Link from "next/link";
import { notFound } from "next/navigation";
import Icon from "@/components/Icon";
import PageHero from "@/components/PageHero";
import { getOfficeBearerParts } from "@/lib/content";
import { isLang } from "@/lib/i18n";
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
    { href: "/officials/central", title: t("officials.card.central"), sub: t("officials.central.sub"), count: parts.central.length, unit: t("officials.unit.people") },
    { href: "/officials/divisional", title: t("officials.card.divisional"), sub: t("officials.divisional.sub"), count: parts.divisions.length, unit: t("officials.unit.divisions") },
    { href: "/officials/branch", title: t("officials.card.branch"), sub: t("officials.branch.sub"), count: branchCount, unit: t("officials.unit.branches") },
  ];
  return (
    <>
      <PageHero lang={lang} title={title} sub={t("officials.sub")} crumbs={[{ href: `/${lang}`, label: ui.home }, { label: title }]} />
      <div className="mx-auto max-w-wrap px-5 py-12 sm:px-8 sm:py-14">
        <ul className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {cards.map((c) => (
            <li key={c.href}>
              <Link href={`/${lang}${c.href}`} className="group flex h-full flex-col border border-line bg-white p-6 transition hover:border-ink sm:p-7">
                <span className="grid h-12 w-12 place-items-center bg-ink text-signal group-hover:bg-brand group-hover:text-white">
                  <Icon name="people" />
                </span>
                <h2 className="mt-5 text-xl font-medium leading-snug">{c.title}</h2>
                <p className="mt-2 text-muted">{c.sub}</p>
                <p className="mt-auto pt-6 text-sm text-muted">
                  <strong className="text-2xl font-bold text-ink">{c.count.toLocaleString(lang === "hi" ? "hi-IN" : "en-IN")}</strong> {c.unit}
                </p>
                <span className="mt-3 inline-flex min-h-11 items-center gap-2 font-medium text-brand">
                  {t("officials.open")} <Icon name="arrow" size={18} className="transition group-hover:translate-x-1" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
