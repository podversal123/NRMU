import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import PageFallback from "@/components/PageFallback";
import PageHero from "@/components/PageHero";
import { getPublicMeeting, getPublicMeetingTypes } from "@/lib/content";
import { isLang } from "@/lib/i18n";
import { navTitle } from "@/lib/nav";
import { getSettings, getUi, pick, setting } from "@/lib/queries";
import { whenIst } from "@/lib/when";

type Props = { params: Promise<{ lang: string; type: string; id: string }> };

export async function generateMetadata({ params }: Props) {
  const { lang, id } = await params;
  if (!isLang(lang) || !/^\d+$/.test(id)) return {};
  const m = await getPublicMeeting(Number(id));
  return m ? { title: pick(lang, m.titleEn, m.titleHi) } : {};
}

export default function MeetingPage({ params }: Props) {
  return (
    <Suspense fallback={<PageFallback />}>
      <Content params={params} />
    </Suspense>
  );
}

const link = "inline-flex min-h-11 items-center font-medium text-brand underline decoration-signal decoration-2 underline-offset-4 hover:text-ink";

async function Content({ params }: Props) {
  const { lang, type, id } = await params;
  if (!isLang(lang) || !/^\d+$/.test(type) || !/^\d+$/.test(id)) notFound();
  const m = await getPublicMeeting(Number(id));
  if (!m || m.typeId !== Number(type)) notFound();
  const [ui, s, parent, kinds] = await Promise.all([getUi(lang), getSettings(), navTitle(lang, "/meetings"), getPublicMeetingTypes()]);
  const t = (k: string) => setting(s, k, lang);
  const kind = kinds.find((x) => x.id === m.typeId);
  const kindName = kind ? pick(lang, kind.nameEn, kind.nameHi) : parent;
  const title = pick(lang, m.titleEn, m.titleHi);
  const venue = pick(lang, m.venueEn, m.venueHi);
  const agenda = pick(lang, m.agendaEn, m.agendaHi);
  const resolutions = pick(lang, m.resolutionsEn, m.resolutionsHi);
  const facts: [string, string][] = [
    [t("meetings.when"), whenIst(m.startsAt, lang)],
    ...(venue ? ([[t("meetings.place"), venue]] as [string, string][]) : []),
    [t("meetings.for"), pick(lang, m.divisionEn, m.divisionHi) || t("meetings.whole_union")],
  ];
  return (
    <>
      <PageHero
        lang={lang}
        title={title}
        crumbs={[{ href: `/${lang}`, label: ui.home }, { href: `/${lang}/meetings`, label: parent }, { href: `/${lang}/meetings/${m.typeId}`, label: kindName }, { label: title }]}
      />
      <div className="mx-auto max-w-4xl px-5 py-12 sm:px-8 sm:py-14">
        <dl className="grid grid-cols-1 gap-x-8 gap-y-4 border-y border-line py-6 sm:grid-cols-[auto_1fr]">
          {facts.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="font-semibold text-muted">{k}</dt>
              <dd className="break-words">{v}</dd>
            </div>
          ))}
        </dl>

        {(m.noticeUrl || m.minutesUrl) && (
          <p className="mt-6 flex flex-wrap gap-x-8">
            {m.noticeUrl && <a href={m.noticeUrl} target="_blank" rel="noopener noreferrer" className={link}>{t("meetings.notice")}</a>}
            {m.minutesUrl && <a href={m.minutesUrl} target="_blank" rel="noopener noreferrer" className={link}>{t("meetings.minutes_file")}</a>}
          </p>
        )}

        {agenda && (
          <section className="mt-10">
            <div className="track-red mb-4 w-24" />
            <h2 className="text-2xl font-medium">{ui.agenda}</h2>
            <p className="mt-4 whitespace-pre-line break-words">{agenda}</p>
          </section>
        )}
        {resolutions && (
          <section className="mt-10">
            <div className="track-red mb-4 w-24" />
            <h2 className="text-2xl font-medium">{t("meetings.resolutions")}</h2>
            <p className="mt-4 whitespace-pre-line break-words">{resolutions}</p>
          </section>
        )}
        {m.minutesText && (
          <section className="mt-10">
            <div className="track-red mb-4 w-24" />
            <h2 className="text-2xl font-medium">{ui.minutes}</h2>
            <p className="mt-4 whitespace-pre-line break-words">{m.minutesText}</p>
          </section>
        )}

        <p className="mt-12">
          <Link href={`/${lang}/meetings/${m.typeId}`} className={link}>← {kindName}</Link>
        </p>
      </div>
    </>
  );
}
