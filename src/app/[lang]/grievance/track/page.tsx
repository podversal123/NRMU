import { notFound } from "next/navigation";
import PageHero from "@/components/PageHero";
import { isLang } from "@/lib/i18n";
import { getUi } from "@/lib/queries";
import TrackForm from "./TrackForm";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  return { title: (await getUi(lang)).gTrackTitle };
}

export default async function TrackPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const ui = await getUi(lang);
  return (
    <>
      <PageHero lang={lang} title={ui.gTrackTitle} sub={ui.gTrackText} crumbs={[{ href: `/${lang}`, label: ui.home }, { href: `/${lang}/grievance`, label: ui.gOpenForm }, { label: ui.gTrackTitle }]} />
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <TrackForm lang={lang} ui={ui} />
      </div>
    </>
  );
}
