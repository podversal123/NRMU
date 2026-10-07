import { notFound } from "next/navigation";
import PageHero from "@/components/PageHero";
import { isLang } from "@/lib/i18n";
import { getDivisions, getSettings, pick, setting, getUi } from "@/lib/queries";
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
  const [s, divisions] = await Promise.all([getSettings(), getDivisions()]);
  const title = setting(s, "join.title", lang);
  return (
    <>
      <PageHero lang={lang} title={title} sub={setting(s, "join.sub", lang)} crumbs={[{ href: `/${lang}`, label: ui.home }, { label: title }]} />
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <JoinForm ui={ui} divisions={divisions.map((d) => ({ id: d.id, name: pick(lang, d.nameEn, d.nameHi) }))} />
      </div>
    </>
  );
}
