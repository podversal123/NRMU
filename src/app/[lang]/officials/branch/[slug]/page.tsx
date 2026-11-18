import { notFound } from "next/navigation";
import { Suspense } from "react";
import BranchTable from "@/components/BranchTable";
import PageFallback from "@/components/PageFallback";
import PageHero from "@/components/PageHero";
import { getOfficeBearerParts } from "@/lib/content";
import { isLang, locales } from "@/lib/i18n";
import { navTitle } from "@/lib/nav";
import { getSettings, getUi, pick, setting } from "@/lib/queries";

type Props = { params: Promise<{ lang: string; slug: string }> };

export async function generateStaticParams() {
  const parts = await getOfficeBearerParts();
  return locales.flatMap((lang) => parts.divisions.filter((d) => d.branches.length).map((d) => ({ lang, slug: d.division.slug })));
}

export async function generateMetadata({ params }: Props) {
  const { lang, slug } = await params;
  if (!isLang(lang)) return {};
  const d = (await getOfficeBearerParts()).divisions.find((x) => x.division.slug === slug);
  return d ? { title: pick(lang, d.division.nameEn, d.division.nameHi, d.division.i18n?.name) } : {};
}

export default function BranchOne({ params }: Props) {
  return (
    <Suspense fallback={<PageFallback />}>
      <Content params={params} />
    </Suspense>
  );
}

/** The branches of one division on their own page: a line per branch with its President and Secretary, the whole committee opening under it. */
async function Content({ params }: Props) {
  const { lang, slug } = await params;
  if (!isLang(lang)) notFound();
  const [ui, s, parent, list, parts] = await Promise.all([getUi(lang), getSettings(), navTitle(lang, "/officials"), navTitle(lang, "/officials/branch"), getOfficeBearerParts()]);
  const d = parts.divisions.find((x) => x.division.slug === slug);
  if (!d || !d.branches.length) notFound();
  const t = (k: string) => setting(s, k, lang);
  const listTitle = list || t("officials.card.branch");
  const name = pick(lang, d.division.nameEn, d.division.nameHi, d.division.i18n?.name);
  return (
    <>
      <PageHero
        lang={lang}
        title={name}
        sub={t("officials.branch.sub")}
        crumbs={[{ href: `/${lang}`, label: ui.home }, { href: `/${lang}/officials`, label: parent }, { href: `/${lang}/officials/branch`, label: listTitle }, { label: name }]}
      />
      <div className="mx-auto max-w-wrap px-5 py-10 sm:px-8 sm:py-14">
        <BranchTable
          rows={d.branches.map(({ branch, people }) => ({ id: branch.id, name: pick(lang, branch.nameEn, branch.nameHi, branch.i18n?.name), people }))}
          lang={lang}
          labels={{ branch: ui.branches, phone: ui.cPhone, call: ui.call, pending: t("officials.pending") }}
        />
      </div>
    </>
  );
}
