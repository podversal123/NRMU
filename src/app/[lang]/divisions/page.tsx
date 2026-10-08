import { notFound } from "next/navigation";
import DivisionCard from "@/components/DivisionCard";
import PageHero from "@/components/PageHero";
import { isLang } from "@/lib/i18n";
import { getDivisionCards } from "@/lib/content";
import { getSettings, getUi, setting } from "@/lib/queries";
import { navTitle } from "@/lib/nav";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return { title: isLang(lang) ? await navTitle(lang, "/divisions") : undefined };
}

export default async function DivisionsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const [ui, cards, s, title] = await Promise.all([getUi(lang), getDivisionCards(), getSettings(), navTitle(lang, "/divisions")]);
  const labels = { secretary: setting(s, "division.secretary_label", lang), branches: ui.branches, branchSecretaries: ui.branchSecretaries };

  return (
    <>
      <PageHero lang={lang} title={title} sub={setting(s, "divisions.sub", lang)} crumbs={[{ href: `/${lang}`, label: ui.home }, { label: title }]} />
      <div className="mx-auto grid max-w-[1180px] gap-5 px-5 py-14 sm:grid-cols-2 sm:px-8 lg:grid-cols-3">
        {cards.map((d) => (
          <DivisionCard key={d.slug} d={d} lang={lang} labels={labels} />
        ))}
      </div>
    </>
  );
}
