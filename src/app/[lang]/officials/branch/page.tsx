import Link from "next/link";
import { notFound } from "next/navigation";
import PageHero from "@/components/PageHero";
import { getOfficeBearerParts } from "@/lib/content";
import { isLang } from "@/lib/i18n";
import { navTitle } from "@/lib/nav";
import { getSettings, getUi, pick, setting } from "@/lib/queries";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  return { title: (await navTitle(lang, "/officials/branch")) || setting(await getSettings(), "officials.card.branch", lang) };
}

/** A part for every branch (grouped by division), each showing its Secretary. */
export default async function BranchOfficeBearers({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const [ui, s, parent, own, parts] = await Promise.all([getUi(lang), getSettings(), navTitle(lang, "/officials"), navTitle(lang, "/officials/branch"), getOfficeBearerParts()]);
  const t = (k: string) => setting(s, k, lang);
  const title = own || t("officials.card.branch");
  const withBranches = parts.divisions.filter((d) => d.branches.length);
  return (
    <>
      <PageHero lang={lang} title={title} sub={t("officials.branch.sub")} crumbs={[{ href: `/${lang}`, label: ui.home }, { href: `/${lang}/officials`, label: parent }, { label: title }]} />
      <div className="mx-auto max-w-wrap px-5 py-10 sm:px-8 sm:py-14">
        <nav aria-label={t("officials.jump")} className="mb-10">
          <p className="mb-3 text-sm font-semibold text-muted">{t("officials.jump")}</p>
          <ul className="flex flex-wrap gap-2">
            {withBranches.map((d) => (
              <li key={d.division.id}>
                <a href={`#${d.division.slug}`} className="inline-flex min-h-11 items-center border border-line bg-white px-4 text-sm font-medium hover:border-ink">
                  {pick(lang, d.division.nameEn, d.division.nameHi)} <span className="ml-2 text-muted">{d.branches.length}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-14">
          {withBranches.map((d) => (
            <section key={d.division.id} id={d.division.slug} aria-labelledby={`h-${d.division.slug}`} className="scroll-mt-24">
              <div className="track-red mb-5 w-24" />
              <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                <h2 id={`h-${d.division.slug}`} className="text-2xl font-medium">{pick(lang, d.division.nameEn, d.division.nameHi)}</h2>
                <Link href={`/${lang}/divisions/${d.division.slug}`} className="inline-flex min-h-11 items-center font-medium text-brand underline underline-offset-4">
                  {t("officials.division_page")}
                </Link>
              </div>
              <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {d.branches.map(({ branch, secretaries }) => (
                  <li key={branch.id} className="min-w-0 border border-line bg-white p-4">
                    <h3 className="break-words font-medium leading-snug">{pick(lang, branch.nameEn, branch.nameHi)}</h3>
                    {secretaries.length ? (
                      secretaries.map((p) => (
                        <div key={p.id} className="mt-2 break-words">
                          <p className="text-sm text-brand">{pick(lang, p.designationEn, p.designationHi)}</p>
                          <p className="font-medium">{pick(lang, p.nameEn, p.nameHi)}</p>
                          {p.phone && (
                            <a href={`tel:${p.phone.replace(/\s/g, "")}`} aria-label={`${ui.call} ${p.phone}`} className="inline-flex min-h-11 items-center text-sm font-bold hover:text-brand">
                              ☎ {p.phone}
                            </a>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="mt-2 text-sm text-muted">{t("officials.pending")}</p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
