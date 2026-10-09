import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import PageFallback from "@/components/PageFallback";
import PageHero from "@/components/PageHero";
import { getPublicMeetings, getPublicMeetingTypes } from "@/lib/content";
import { isLang } from "@/lib/i18n";
import { navTitle } from "@/lib/nav";
import { getSettings, getUi, pick, setting } from "@/lib/queries";
import { whenIst } from "@/lib/when";

type Props = { params: Promise<{ lang: string; type: string }> };

export async function generateMetadata({ params }: Props) {
  const { lang, type } = await params;
  if (!isLang(lang) || !/^\d+$/.test(type)) return {};
  const k = (await getPublicMeetingTypes()).find((x) => x.id === Number(type));
  return k ? { title: pick(lang, k.nameEn, k.nameHi) } : {};
}

export default function MeetingTypePage({ params }: Props) {
  return (
    <Suspense fallback={<PageFallback />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: Props) {
  const { lang, type } = await params;
  if (!isLang(lang) || !/^\d+$/.test(type)) notFound();
  const kinds = await getPublicMeetingTypes();
  const kind = kinds.find((x) => x.id === Number(type));
  if (!kind) notFound();
  const [ui, s, parent, rows] = await Promise.all([getUi(lang), getSettings(), navTitle(lang, "/meetings"), getPublicMeetings(kind.id)]);
  const t = (k: string) => setting(s, k, lang);
  const title = pick(lang, kind.nameEn, kind.nameHi);
  return (
    <>
      <PageHero lang={lang} title={title} sub={t("meetings.sub")} crumbs={[{ href: `/${lang}`, label: ui.home }, { href: `/${lang}/meetings`, label: parent }, { label: title }]} />
      <div className="mx-auto max-w-wrap px-5 py-12 sm:px-8 sm:py-14">
        {rows.length ? (
          <ul className="divide-y divide-line border-y border-line">
            {rows.map((m) => (
              <li key={m.id}>
                <Link href={`/${lang}/meetings/${kind.id}/${m.id}`} className="group block py-5 sm:py-6">
                  <p className="font-display text-lg font-bold text-brand">{whenIst(m.startsAt, lang)}</p>
                  <h2 className="mt-1 text-xl font-medium leading-snug group-hover:underline group-hover:decoration-signal group-hover:decoration-2 group-hover:underline-offset-4">{pick(lang, m.titleEn, m.titleHi)}</h2>
                  <p className="mt-1 text-muted">{[pick(lang, m.venueEn, m.venueHi), pick(lang, m.divisionEn, m.divisionHi)].filter(Boolean).join(" · ")}</p>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted">{t("meetings.empty")}</p>
        )}
      </div>
    </>
  );
}
