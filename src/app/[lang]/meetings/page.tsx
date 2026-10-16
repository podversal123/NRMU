import Link from "next/link";
import { notFound } from "next/navigation";
import Icon from "@/components/Icon";
import PageHero from "@/components/PageHero";
import { getPublicMeetingTypes } from "@/lib/content";
import { intlLocale, isLang } from "@/lib/i18n";
import { navTitle } from "@/lib/nav";
import { getSettings, getUi, pick, setting } from "@/lib/queries";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return { title: isLang(lang) ? await navTitle(lang, "/meetings") : undefined };
}

/** "Annual General Meeting (AGM)" gives AGM; a name without a bracket gives its initials ("Standing Committee" gives SC). */
function shortName(name: string) {
  const m = name.match(/\(([^)]+)\)/);
  if (m) return m[1];
  return name.split(/\s+/).filter(Boolean).map((w) => w[0]).join("").slice(0, 3).toUpperCase();
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
          <ul className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {types.map((k) => (
              <li key={k.id}>
                <Link href={`/${lang}/meetings/${k.id}`} className="group flex h-full overflow-hidden rounded-lg border border-line bg-white shadow-sm transition hover:shadow-xl">
                  <span className="grid w-28 shrink-0 place-items-center bg-gradient-to-br from-brand to-brand-deep px-2 text-center text-2xl font-bold tracking-wide text-signal sm:w-32">
                    {shortName(k.nameEn)}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col justify-center gap-3 px-5 py-5 sm:px-6">
                    {/* the bracketed short name already shows in the block on the left */}
                    <h2 className="text-lg font-semibold leading-snug sm:text-xl">{pick(lang, k.nameEn, k.nameHi, k.i18n?.name).replace(/\s*\([^)]*\)\s*/, "").trim()}</h2>
                    <div className="flex items-center justify-between gap-3">
                      <span className="whitespace-nowrap rounded-full bg-signal/20 px-3 py-1 text-sm font-bold text-ink">
                        {k.count.toLocaleString(intlLocale(lang))} {t("meetings.unit")}
                      </span>
                      <span className="inline-flex min-h-11 items-center gap-2 font-medium text-brand">
                        {t("meetings.open")} <Icon name="arrow" size={18} className="transition group-hover:translate-x-1" />
                      </span>
                    </div>
                  </div>
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
