import Link from "next/link";
import { notFound } from "next/navigation";
import PageHero from "@/components/PageHero";
import PersonCard from "@/components/PersonCard";
import { getOfficeBearerParts } from "@/lib/content";
import { isLang } from "@/lib/i18n";
import { navTitle } from "@/lib/nav";
import { getSettings, getUi, pick, setting } from "@/lib/queries";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  return { title: (await navTitle(lang, "/officials/divisional")) || setting(await getSettings(), "officials.card.divisional", lang) };
}

/** A part for every division, each with its President and Secretary. A division without them yet says so. */
export default async function DivisionalOfficeBearers({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const [ui, s, parent, own, parts] = await Promise.all([getUi(lang), getSettings(), navTitle(lang, "/officials"), navTitle(lang, "/officials/divisional"), getOfficeBearerParts()]);
  const t = (k: string) => setting(s, k, lang);
  const title = own || t("officials.card.divisional");
  return (
    <>
      <PageHero lang={lang} title={title} sub={t("officials.divisional.sub")} crumbs={[{ href: `/${lang}`, label: ui.home }, { href: `/${lang}/officials`, label: parent }, { label: title }]} />
      <div className="mx-auto max-w-wrap px-5 py-10 sm:px-8 sm:py-14">
        <nav aria-label={t("officials.jump")} className="mb-10">
          <p className="mb-3 text-sm font-semibold text-muted">{t("officials.jump")}</p>
          <ul className="flex flex-wrap gap-2">
            {parts.divisions.map((d) => (
              <li key={d.division.id}>
                <a href={`#${d.division.slug}`} className="inline-flex min-h-11 items-center border border-line bg-white px-4 text-sm font-medium hover:border-ink">
                  {pick(lang, d.division.nameEn, d.division.nameHi)}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-14">
          {parts.divisions.map((d) => (
            <section key={d.division.id} id={d.division.slug} aria-labelledby={`h-${d.division.slug}`} className="scroll-mt-24">
              <div className="track-red mb-5 w-24" />
              <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                <h2 id={`h-${d.division.slug}`} className="text-2xl font-medium">{pick(lang, d.division.nameEn, d.division.nameHi)}</h2>
                <Link href={`/${lang}/divisions/${d.division.slug}`} className="inline-flex min-h-11 items-center font-medium text-brand underline underline-offset-4">
                  {t("officials.division_page")}
                </Link>
              </div>
              {d.leaders.length ? (
                <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {d.leaders.map((p) => (
                    <PersonCard key={p.id} p={p} lang={lang} callLabel={ui.call} />
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-muted">{t("officials.pending")}</p>
              )}
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
