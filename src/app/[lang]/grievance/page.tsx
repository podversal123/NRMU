import { notFound } from "next/navigation";
import PageHero from "@/components/PageHero";
import { getGrievanceTypes } from "@/lib/content";
import { isLang } from "@/lib/i18n";
import { getDivisions, getSettings, getUi, pick, setting } from "@/lib/queries";
import GrievanceForm from "./GrievanceForm";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  return { title: setting(await getSettings(), "grievance.title", lang) };
}

export default async function GrievancePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const [ui, s, divisions, types] = await Promise.all([
    getUi(lang),
    getSettings(),
    getDivisions(),
    getGrievanceTypes(),
  ]);
  const title = setting(s, "grievance.title", lang);
  return (
    <>
      <PageHero lang={lang} title={title} sub={setting(s, "grievance.sub", lang)} crumbs={[{ href: `/${lang}`, label: ui.home }, { label: title }]} />
      <div className="mx-auto max-w-wrap px-5 pb-16 pt-8 sm:px-8 lg:pt-10">
        <GrievanceForm
          lang={lang}
          ui={ui}
          divisions={divisions.map((d) => ({ id: d.id, name: pick(lang, d.nameEn, d.nameHi, d.i18n?.name) }))}
          types={types.map((t) => ({ id: t.id, name: pick(lang, t.nameEn, t.nameHi, t.i18n?.name) }))}
        />
      </div>
    </>
  );
}
