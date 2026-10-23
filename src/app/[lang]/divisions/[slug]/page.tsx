import { notFound } from "next/navigation";
import { Suspense } from "react";
import PageFallback from "@/components/PageFallback";
import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import BranchTable from "@/components/BranchTable";
import BranchTarget from "@/components/BranchTarget";
import OfficeList from "@/components/OfficeList";
import PersonCard from "@/components/PersonCard";
import { isLang, locales } from "@/lib/i18n";
import { getDivisionCards, getDivisionDetail } from "@/lib/content";
import { pick, getSettings, getUi, setting } from "@/lib/queries";
import { navTitle } from "@/lib/nav";

type Props = { params: Promise<{ lang: string; slug: string }> };

export async function generateStaticParams() {
  const cards = await getDivisionCards();
  return locales.flatMap((lang) => cards.map((d) => ({ lang, slug: d.slug })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!isLang(lang)) return {};
  const d = await getDivisionDetail(slug);
  return d ? { title: pick(lang, d.division.nameEn, d.division.nameHi, d.division.i18n?.name) } : {};
}

export default function DivisionPage({ params }: Props) {
  return (
    <Suspense fallback={<PageFallback />}>
      <DivisionPageContent params={params} />
    </Suspense>
  );
}

async function DivisionPageContent({ params }: Props) {
  const { lang, slug } = await params;
  if (!isLang(lang)) notFound();
  const [data, divTitle] = await Promise.all([getDivisionDetail(slug), navTitle(lang, "/divisions")]);
  if (!data) notFound();
  const [ui, s] = await Promise.all([getUi(lang), getSettings()]);
  const t = (k: string) => setting(s, k, lang);
  const name = pick(lang, data.division.nameEn, data.division.nameHi, data.division.i18n?.name);
  const leaders = data.people.filter((p) => p.scope === "division_president" || p.scope === "division_secretary");
  const body = data.people.filter((p) => p.scope === "division_body");

  return (
    <>
      <PageHero
        lang={lang}
        title={name}
        sub={pick(lang, data.division.descriptionEn, data.division.descriptionHi, data.division.i18n?.description) || undefined}
        crumbs={[{ href: `/${lang}`, label: ui.home }, { href: `/${lang}/divisions`, label: divTitle }, { label: name }]}
      />
      <div className="mx-auto max-w-wrap space-y-14 px-5 py-14 sm:px-8">
        {/* the division's own committee: the President and the Secretary as cards, everyone else in a list under them */}
        {(leaders.length > 0 || body.length > 0) && (
          <section aria-labelledby="division-body">
            <h2 id="division-body" className="font-display text-2xl font-semibold">
              {t("officials.card.divisional")} <span className="text-muted">({leaders.length + body.length})</span>
            </h2>
            {leaders.length > 0 && (
              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {leaders.map((p) => (
                  <PersonCard key={p.id} p={p} lang={lang} callLabel={ui.call} />
                ))}
              </div>
            )}
            {body.length > 0 && (
              <div className="mt-4 overflow-hidden rounded-xl border border-line bg-white px-4 shadow-[0_2px_10px_-4px_rgba(111,26,23,0.18)] sm:px-5">
                <OfficeList people={body} lang={lang} callLabel={ui.call} columns />
              </div>
            )}
          </section>
        )}

        {data.branches.length > 0 && (
          <section>
            <h2 className="font-display text-2xl font-semibold sm:text-2xl">
              {ui.branches} <span className="text-muted">({data.branches.length})</span>
            </h2>
            {/* every branch as a line with its President and Secretary, the whole committee opening under it */}
            <div className="mt-6">
              <BranchTable
                rows={data.branches.map((b) => ({ id: b.id, name: pick(lang, b.nameEn, b.nameHi, b.i18n?.name), people: data.people.filter((p) => p.scope.startsWith("branch_") && p.branchId === b.id) }))}
                lang={lang}
                labels={{ branch: ui.branches, phone: ui.cPhone, call: ui.call, pending: t("officials.pending") }}
              />
            </div>
            <BranchTarget />
          </section>
        )}
      </div>
    </>
  );
}
