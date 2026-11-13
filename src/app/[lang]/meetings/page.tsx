import { notFound } from "next/navigation";
import MeetingFan from "@/components/MeetingFan";
import PageHero from "@/components/PageHero";
import { getPublicMeetingTypes } from "@/lib/content";
import { isLang } from "@/lib/i18n";
import { fanItems } from "@/lib/meeting-fan";
import { navTitle } from "@/lib/nav";
import { getSettings, getUi, setting } from "@/lib/queries";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return { title: isLang(lang) ? await navTitle(lang, "/meetings") : undefined };
}

/** One heading, Meetings, with a fan of cards, one for each kind (Standing Committee, AGM, Branch Council Minutes...). */
export default async function MeetingsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const [ui, s, title, types] = await Promise.all([getUi(lang), getSettings(), navTitle(lang, "/meetings"), getPublicMeetingTypes()]);
  const t = (k: string) => setting(s, k, lang);
  // a kind with a parent (Opening Speech inside PNM) shows on its parent's page, not here
  const items = fanItems(lang, types.filter((k) => !k.parentId), types, t("meetings.unit"));
  return (
    <>
      <PageHero lang={lang} title={title} sub={t("meetings.sub")} crumbs={[{ href: `/${lang}`, label: ui.home }, { label: title }]} />
      <div className="mx-auto max-w-wrap px-5 py-12 sm:px-8 sm:py-14">
        {items.length ? <MeetingFan items={items} open={t("meetings.open")} /> : <p className="text-muted">{t("meetings.empty")}</p>}
      </div>
    </>
  );
}
