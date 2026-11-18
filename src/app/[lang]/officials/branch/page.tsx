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
  return { title: (await navTitle(lang, "/officials/branch")) || setting(await getSettings(), "officials.card.branch", lang) };
}

/** The divisions that have branches as a list: each one opens its own page with its branches. */
export default async function BranchOfficeBearers({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const [ui, s, parent, own, parts] = await Promise.all([getUi(lang), getSettings(), navTitle(lang, "/officials"), navTitle(lang, "/officials/branch"), getOfficeBearerParts()]);
  const t = (k: string) => setting(s, k, lang);
  const title = own || t("officials.card.branch");
  return (
    <>
      <PageHero lang={lang} title={title} sub={t("officials.branch.sub")} crumbs={[{ href: `/${lang}`, label: ui.home }, { href: `/${lang}/officials`, label: parent }, { label: title }]} />
      <div className="mx-auto max-w-wrap px-5 py-10 sm:px-8 sm:py-14">
        <OfficialsPicker
          items={parts.divisions
            .filter((d) => d.branches.length)
            .map((d) => ({
              href: `/${lang}/officials/branch/${d.division.slug}`,
              label: pick(lang, d.division.nameEn, d.division.nameHi, d.division.i18n?.name),
              count: d.branches.length,
            }))}
        />
      </div>
    </>
  );
}
