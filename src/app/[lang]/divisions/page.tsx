import Link from "next/link";
import { notFound } from "next/navigation";
import Icon from "@/components/Icon";
import PageHero from "@/components/PageHero";
import { isLang } from "@/lib/i18n";
import { getDivisionCards } from "@/lib/content";
import { getSettings, pick, setting, getUi } from "@/lib/queries";
import { navTitle } from "@/lib/nav";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return { title: isLang(lang) ? await navTitle(lang, "/divisions") : undefined };
}

export default async function DivisionsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const ui = await getUi(lang);
  const [cards, s, title] = await Promise.all([getDivisionCards(), getSettings(), navTitle(lang, "/divisions")]);
  const t = (k: string) => setting(s, k, lang);
  const num = (n: number) => n.toLocaleString(lang === "hi" ? "hi-IN" : "en-IN");

  return (
    <>
      <PageHero lang={lang} title={title} sub={t("divisions.sub")} crumbs={[{ href: `/${lang}`, label: ui.home }, { label: title }]} />
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-14 sm:grid-cols-2 sm:px-6 lg:grid-cols-3">
        {cards.map((d) => {
          const secretary = pick(lang, d.secretaryEn, d.secretaryHi);
          const president = pick(lang, d.presidentEn, d.presidentHi);
          return (
            <Link
              key={d.slug}
              href={`/${lang}/divisions/${d.slug}`}
              className="group relative flex flex-col overflow-hidden rounded-none border border-line bg-white transition duration-200 hover:border-ink"
            >
              <div className="relative bg-coal px-7 pb-6 pt-6 text-light">
                <div className="flex items-start justify-between">
                  <span />
                  <Icon name="arrow" className="text-dim transition group-hover:translate-x-1 group-hover:text-signal" />
                </div>
                <h2 className="mt-5 font-display text-5xl font-semibold leading-none">{pick(lang, d.nameEn, d.nameHi)}</h2>
                {d.nameHi && <p className="mt-2 text-sm text-dim">{lang === "hi" ? d.nameEn : d.nameHi}</p>}
                
              </div>

              <div className="flex flex-1 flex-col gap-4 px-7 py-6">
                {secretary && (
                  <div>
                    <p className="text-sm text-brand">{t("division.secretary_label")}</p>
                    <p className="mt-0.5 font-semibold leading-snug">{secretary}</p>
                  </div>
                )}
                {president && (
                  <div>
                    <p className="text-sm text-brand">{t("division.president_label")}</p>
                    <p className="mt-0.5 font-semibold leading-snug">{president}</p>
                  </div>
                )}
                <dl className="mt-auto grid grid-cols-2 gap-3 border-t border-line pt-5">
                  <div>
                    <dd className="font-display text-3xl font-bold leading-none">{num(d.branches)}</dd>
                    <dt className="mt-1 text-sm text-muted">{ui.branches}</dt>
                  </div>
                  <div>
                    <dd className="font-display text-3xl font-bold leading-none">{num(d.secretaries)}</dd>
                    <dt className="mt-1 text-sm text-muted">{ui.branchSecretaries}</dt>
                  </div>
                </dl>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
