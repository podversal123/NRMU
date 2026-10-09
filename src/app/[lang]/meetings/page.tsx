import Link from "next/link";
import { notFound } from "next/navigation";
import Icon from "@/components/Icon";
import PageHero from "@/components/PageHero";
import { getPublicMeetingTypes } from "@/lib/content";
import { isLang } from "@/lib/i18n";
import { navTitle } from "@/lib/nav";
import { getSettings, getUi, pick, setting } from "@/lib/queries";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return { title: isLang(lang) ? await navTitle(lang, "/meetings") : undefined };
}

/** One heading, Meetings, with a sub-heading for each kind (Standing Committee, AGM, Branch Council Minutes...). */
export default async function MeetingsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const [ui, s, title, types] = await Promise.all([getUi(lang), getSettings(), navTitle(lang, "/meetings"), getPublicMeetingTypes()]);
  const t = (k: string) => setting(s, k, lang);
  return (
    <>
      <PageHero lang={lang} title={title} sub={t("meetings.sub")} crumbs={[{ href: `/${lang}`, label: ui.home }, { label: title }]} />
      <div className="mx-auto max-w-wrap px-5 py-12 sm:px-8 sm:py-14">
        {types.length ? (
          <ul className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {types.map((k) => (
              <li key={k.id}>
                <Link href={`/${lang}/meetings/${k.id}`} className="group flex h-full flex-col border border-line bg-white p-6 transition hover:border-ink sm:p-7">
                  <span className="grid h-12 w-12 place-items-center bg-ink text-signal group-hover:bg-brand group-hover:text-white">
                    <Icon name="people" />
                  </span>
                  <h2 className="mt-5 text-xl font-medium leading-snug">{pick(lang, k.nameEn, k.nameHi)}</h2>
                  <p className="mt-auto pt-6 text-sm text-muted">
                    <strong className="text-2xl font-bold text-ink">{k.count.toLocaleString(lang === "hi" ? "hi-IN" : "en-IN")}</strong> {t("meetings.unit")}
                  </p>
                  <span className="mt-3 inline-flex min-h-11 items-center gap-2 font-medium text-brand">
                    {t("meetings.open")} <Icon name="arrow" size={18} className="transition group-hover:translate-x-1" />
                  </span>
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
