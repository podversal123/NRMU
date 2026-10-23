import Link from "next/link";
import { notFound } from "next/navigation";
import BranchTable from "@/components/BranchTable";
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

/** A table of branches for every division: a line per branch with its President and Secretary, the whole committee opening under it. */
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
                <a href={`#${d.division.slug}`} className="group inline-flex min-h-11 items-center rounded-full border border-line bg-white px-5 text-sm font-medium shadow-[0_1px_4px_-2px_rgba(111,26,23,0.2)] transition-colors duration-200 hover:border-brand hover:bg-brand hover:text-white">
                  {pick(lang, d.division.nameEn, d.division.nameHi, d.division.i18n?.name)} <span className="ml-2 text-muted transition-colors duration-200 group-hover:text-white/80">{d.branches.length}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-14">
          {withBranches.map((d) => (
            <section key={d.division.id} id={d.division.slug} aria-labelledby={`h-${d.division.slug}`} className="scroll-mt-24">
              <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                <h2 id={`h-${d.division.slug}`} className="text-2xl font-medium">{pick(lang, d.division.nameEn, d.division.nameHi, d.division.i18n?.name)}</h2>
                <Link href={`/${lang}/divisions/${d.division.slug}`} className="inline-flex min-h-11 items-center font-medium text-brand underline underline-offset-4">
                  {t("officials.division_page")}
                </Link>
              </div>
              <div className="mt-6">
                <BranchTable
                  rows={d.branches.map(({ branch, people }) => ({ id: branch.id, name: pick(lang, branch.nameEn, branch.nameHi, branch.i18n?.name), people }))}
                  lang={lang}
                  labels={{ branch: ui.branches, phone: ui.cPhone, call: ui.call, pending: t("officials.pending") }}
                />
              </div>
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
