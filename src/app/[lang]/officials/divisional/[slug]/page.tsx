import { notFound } from "next/navigation";
import { Suspense } from "react";
import OfficeList from "@/components/OfficeList";
import PageFallback from "@/components/PageFallback";
import PageHero from "@/components/PageHero";
import PersonCard from "@/components/PersonCard";
import { getOfficeBearerParts } from "@/lib/content";
import { isLang, locales } from "@/lib/i18n";
import { navTitle } from "@/lib/nav";
import { getSettings, getUi, pick, setting } from "@/lib/queries";

type Props = { params: Promise<{ lang: string; slug: string }> };

export async function generateStaticParams() {
  const parts = await getOfficeBearerParts();
  return locales.flatMap((lang) => parts.divisions.map((d) => ({ lang, slug: d.division.slug })));
}

export async function generateMetadata({ params }: Props) {
  const { lang, slug } = await params;
  if (!isLang(lang)) return {};
  const d = (await getOfficeBearerParts()).divisions.find((x) => x.division.slug === slug);
  return d ? { title: pick(lang, d.division.nameEn, d.division.nameHi, d.division.i18n?.name) } : {};
}

export default function DivisionalOne({ params }: Props) {
  return (
    <Suspense fallback={<PageFallback />}>
      <Content params={params} />
    </Suspense>
  );
}

/** One division on its own page: its President and Secretary as cards, the rest of its committee in a list under them. */
async function Content({ params }: Props) {
  const { lang, slug } = await params;
  if (!isLang(lang)) notFound();
  const [ui, s, parent, list, parts] = await Promise.all([getUi(lang), getSettings(), navTitle(lang, "/officials"), navTitle(lang, "/officials/divisional"), getOfficeBearerParts()]);
  const d = parts.divisions.find((x) => x.division.slug === slug);
  if (!d) notFound();
  const t = (k: string) => setting(s, k, lang);
  const listTitle = list || t("officials.card.divisional");
  const name = pick(lang, d.division.nameEn, d.division.nameHi, d.division.i18n?.name);
  return (
    <>
      <PageHero
        lang={lang}
        title={name}
        sub={t("officials.divisional.sub")}
        crumbs={[{ href: `/${lang}`, label: ui.home }, { href: `/${lang}/officials`, label: parent }, { href: `/${lang}/officials/divisional`, label: listTitle }, { label: name }]}
      />
      <div className="mx-auto max-w-wrap px-5 py-10 sm:px-8 sm:py-14">
        {d.leaders.length || d.body.length ? (
          <>
            {d.leaders.length > 0 && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {d.leaders.map((p) => (
                  <PersonCard key={p.id} p={p} lang={lang} callLabel={ui.call} />
                ))}
              </div>
            )}
            {d.body.length > 0 && (
              <div className="mt-4 overflow-hidden rounded-xl border border-line bg-white px-4 shadow-[0_2px_10px_-4px_rgba(111,26,23,0.18)] sm:px-5">
                <OfficeList people={d.body} lang={lang} callLabel={ui.call} columns />
              </div>
            )}
          </>
        ) : (
          <p className="text-muted">{t("officials.pending")}</p>
        )}
      </div>
    </>
  );
}
