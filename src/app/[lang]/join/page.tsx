import { notFound } from "next/navigation";
import PageHero from "@/components/PageHero";
import { isLang } from "@/lib/i18n";
import { getBranches, getDepartments, getDivisions, getSettings, pick, setting, getUi } from "@/lib/queries";
import JoinForm from "./JoinForm";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  return { title: setting(await getSettings(), "join.title", lang) };
}

export default async function JoinPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const ui = await getUi(lang);
  const [s, divisions, branches, departments] = await Promise.all([getSettings(), getDivisions(), getBranches(), getDepartments()]);
  const title = setting(s, "join.title", lang);
  return (
    <>
      <PageHero lang={lang} title={title} sub={setting(s, "join.sub", lang)} crumbs={[{ href: `/${lang}`, label: ui.home }, { label: title }]} />
      <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-14">
        <JoinForm
          ui={ui}
          lang={lang}
          divisions={divisions.map((d) => ({ id: d.id, name: pick(lang, d.nameEn, d.nameHi) }))}
          branches={branches.map((b) => ({ id: b.id, divisionId: b.divisionId, name: pick(lang, b.nameEn, b.nameHi) }))}
          departments={departments.map((d) => ({ id: d.id, name: pick(lang, d.nameEn, d.nameHi) }))}
        />
      </div>
    </>
  );
}
