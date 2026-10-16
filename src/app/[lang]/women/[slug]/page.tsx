import { notFound } from "next/navigation";
import { Suspense } from "react";
import PageFallback from "@/components/PageFallback";
import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import SafeHtml from "@/components/SafeHtml";
import { CommitteeSideNav, calmTitle } from "@/components/WingParts";
import { isLang, locales } from "@/lib/i18n";
import { getPage, getPages } from "@/lib/content";
import { getSettings, getUi, pick, setting } from "@/lib/queries";
import { navTitle } from "@/lib/nav";

type Props = { params: Promise<{ lang: string; slug: string }> };

/**
 * The committee lists came over from the old site as hand-made tables: some start with a title row spanning the
 * table, some have empty spacer rows, and the header row is usually bold text in ordinary cells. These rules make
 * any of them read as one clean table: full width, spacer rows hidden, title and header rows marked out, zebra rows.
 */
const TABLE = [
  "[&_table]:!table [&_table]:w-full [&_table]:text-sm",
  // words stay whole inside a cell; a wide table scrolls sideways in its card instead
  "[&_td]:px-3 [&_td]:py-2.5 [&_td]:[overflow-wrap:normal] [&_th]:px-3 [&_th]:py-2.5 [&_th]:[overflow-wrap:normal] [&_td_p]:m-0 [&_th_p]:m-0",
  "[&_tr:nth-child(even)]:bg-paper/60",
  "[&_th]:!border-brand-deep [&_th]:!bg-brand [&_th]:font-semibold [&_th]:text-white",
].join(" ");

const cellText = (cell: string) => cell.replace(/<[^>]+>/g, "").replace(/&nbsp;|\s/g, "");

/**
 * Turns the old hand-made tables into ones with a real header: empty spacer rows are dropped, and every row up to
 * and including the first one with at least two filled cells (the column names) becomes header cells. Nothing can
 * be told apart by styling alone, since in some tables every cell of every row is bold.
 */
function markTableHeads(html: string) {
  return html.replace(/<table[\s\S]*?<\/table>/gi, (table) => {
    let headDone = false;
    return table.replace(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi, (row) => {
      const cells = row.match(/<td\b[\s\S]*?<\/td>/gi) ?? [];
      const filled = cells.filter((c) => cellText(c)).length;
      if (!filled) return "";
      if (headDone) return row;
      if (filled >= 2) headDone = true;
      return row.replace(/<td\b/gi, "<th").replace(/<\/td>/gi, "</th>");
    });
  });
}

export async function generateStaticParams() {
  const pages = await getPages(setting(await getSettings(), "config.women.page_pattern", "en"));
  return locales.flatMap((lang) => pages.map((p) => ({ lang, slug: p.slug })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!isLang(lang)) return {};
  const p = await getPage(slug);
  return p ? { title: calmTitle(pick(lang, p.titleEn, p.titleHi, p.i18n?.title)) } : {};
}

export default function WomenPageDetail({ params }: Props) {
  return (
    <Suspense fallback={<PageFallback />}>
      <WomenPageDetailContent params={params} />
    </Suspense>
  );
}

async function WomenPageDetailContent({ params }: Props) {
  const { lang, slug } = await params;
  if (!isLang(lang)) notFound();
  const s = await getSettings();
  const [page, section, pages, ui] = await Promise.all([getPage(slug), navTitle(lang, "/women"), getPages(setting(s, "config.women.page_pattern", lang)), getUi(lang)]);
  if (!page) notFound();
  const title = calmTitle(pick(lang, page.titleEn, page.titleHi, page.i18n?.title));
  return (
    <>
      <PageHero lang={lang} title={title} crumbs={[{ href: `/${lang}`, label: ui.home }, { href: `/${lang}/women`, label: section }, { label: title }]} />
      <div className="mx-auto grid max-w-wrap gap-8 px-5 py-10 sm:px-8 lg:grid-cols-[minmax(0,1fr)_19rem] lg:py-12">
        <div className="min-w-0 overflow-hidden rounded-lg border border-line bg-white shadow-sm">
          <div className="overflow-x-auto p-3 sm:p-4">
            <SafeHtml html={markTableHeads(pick(lang, page.contentHtml, page.contentHtmlHi, page.i18n?.content))} className={TABLE} />
          </div>
        </div>
        {pages.length > 1 && (
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <CommitteeSideNav pages={pages} lang={lang} base="women" current={slug} title={setting(s, "women.pages_title", lang)} back={section} />
          </aside>
        )}
      </div>
    </>
  );
}
