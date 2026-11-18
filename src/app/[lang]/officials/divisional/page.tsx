import { notFound } from "next/navigation";
import OfficialsPicker from "@/components/OfficialsPicker";
import PageHero from "@/components/PageHero";
import { getOfficeBearerParts } from "@/lib/content";
import { isLang } from "@/lib/i18n";
import { navTitle } from "@/lib/nav";
import { getSettings, getUi, pick, setting } from "@/lib/queries";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  return { title: (await navTitle(lang, "/officials/divisional")) || setting(await getSettings(), "officials.card.divisional", lang) };
}

/** The divisions as a list: each one opens its own page with its President, Secretary and committee. */
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
        <OfficialsPicker
          items={parts.divisions.map((d) => ({
            href: `/${lang}/officials/divisional/${d.division.slug}`,
            label: pick(lang, d.division.nameEn, d.division.nameHi, d.division.i18n?.name),
            count: d.leaders.length + d.body.length,
          }))}
        />
      </div>
    </>
  );
}
