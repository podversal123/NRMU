import { notFound } from "next/navigation";
import { Suspense } from "react";
import PageFallback from "@/components/PageFallback";
import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import SafeHtml from "@/components/SafeHtml";
import { isLang, locales } from "@/lib/i18n";
import { getPage, getPages } from "@/lib/content";
import { getSettings, getUi, pick, setting } from "@/lib/queries";
import { navTitle } from "@/lib/nav";

type Props = { params: Promise<{ lang: string; slug: string }> };

export async function generateStaticParams() {
  const pages = await getPages(setting(await getSettings(), "config.women.page_pattern", "en"));
  return locales.flatMap((lang) => pages.map((p) => ({ lang, slug: p.slug })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!isLang(lang)) return {};
  const p = await getPage(slug);
  return p ? { title: pick(lang, p.titleEn, p.titleHi) } : {};
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
  const [page, section] = await Promise.all([getPage(slug), navTitle(lang, "/women")]);
  if (!page) notFound();
  const title = pick(lang, page.titleEn, page.titleHi);
  return (
    <>
      <PageHero lang={lang} title={title} crumbs={[{ href: `/${lang}`, label: (await getUi(lang)).home }, { href: `/${lang}/women`, label: section }, { label: title }]} />
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="rounded-none border border-line bg-white p-6 sm:p-10">
          <SafeHtml html={pick(lang, page.contentHtml, page.contentHtmlHi)} />
        </div>
      </div>
    </>
  );
}
