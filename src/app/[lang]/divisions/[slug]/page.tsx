import { notFound } from "next/navigation";
import { Suspense } from "react";
import PageFallback from "@/components/PageFallback";
import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import PersonCard from "@/components/PersonCard";
import { isLang, locales } from "@/lib/i18n";
import { getDivisionCards, getDivisionDetail } from "@/lib/content";
import { pick, getUi } from "@/lib/queries";
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
  return d ? { title: pick(lang, d.division.nameEn, d.division.nameHi) } : {};
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
  const ui = await getUi(lang);
  const name = pick(lang, data.division.nameEn, data.division.nameHi);
  const leaders = data.people.filter((p) => p.scope !== "branch_secretary");
  const secretaries = data.people.filter((p) => p.scope === "branch_secretary");

  return (
    <>
      <PageHero
        lang={lang}
        title={name}
        sub={pick(lang, data.division.descriptionEn, data.division.descriptionHi) || undefined}
        crumbs={[{ href: `/${lang}`, label: ui.home }, { href: `/${lang}/divisions`, label: divTitle }, { label: name }]}
      />
      <div className="mx-auto max-w-[1180px] space-y-14 px-5 py-14 sm:px-8">
        {leaders.length > 0 && (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {leaders.map((p) => (
              <PersonCard key={p.id} p={p} lang={lang} callLabel={ui.call} />
            ))}
          </section>
        )}

        {data.branches.length > 0 && (
          <section>
            <div className="track-red mb-5 w-24" />
            <h2 className="font-display text-2xl font-semibold sm:text-2xl">
              {ui.branches} <span className="text-muted">({data.branches.length})</span>
            </h2>
            <ul className="mt-6 flex flex-wrap gap-2">
              {data.branches.map((b) => (
                <li key={b.id} className="rounded-full border border-line bg-white px-4 py-2 text-[0.95rem] font-semibold">
                  {pick(lang, b.nameEn, b.nameHi)}
                </li>
              ))}
            </ul>
          </section>
        )}

        {secretaries.length > 0 && (
          <section>
            <div className="track-red mb-5 w-24" />
            <h2 className="font-display text-2xl font-semibold sm:text-2xl">{ui.branchSecretaries}</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {secretaries.map((p) => (
                <PersonCard key={p.id} p={p} lang={lang} callLabel={ui.call} />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
