import { notFound } from "next/navigation";
import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import SafeHtml from "@/components/SafeHtml";
import { isLang, locales } from "@/lib/i18n";
import { getPage, getPages } from "@/lib/content";
import { getUi, pick } from "@/lib/queries";

type Props = { params: Promise<{ lang: string; slug: string }> };

export async function generateStaticParams() {
  const pages = await getPages(".");
  return locales.flatMap((lang) => pages.slice(0, 3).map((p) => ({ lang, slug: p.slug })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!isLang(lang)) return {};
  const p = await getPage(slug);
  return p ? { title: pick(lang, p.titleEn, p.titleHi) } : {};
}

/** Any static page stored in the database (handbooks, results, committee lists …). */
export default async function StaticPage({ params }: Props) {
  const { lang, slug } = await params;
  if (!isLang(lang)) notFound();
  const page = await getPage(slug);
  if (!page) notFound();
  const ui = await getUi(lang);
  const title = pick(lang, page.titleEn, page.titleHi);
  return (
    <>
      <PageHero lang={lang} title={title} crumbs={[{ href: `/${lang}`, label: ui.home }, { label: title }]} />
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="border border-line bg-white p-6 sm:p-10">
          <SafeHtml html={pick(lang, page.contentHtml, page.contentHtmlHi)} />
        </div>
      </div>
    </>
  );
}
