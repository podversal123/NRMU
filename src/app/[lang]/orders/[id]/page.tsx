import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import PageFallback from "@/components/PageFallback";
import type { Metadata } from "next";
import Icon from "@/components/Icon";
import OrderFeedActions from "@/components/feed/OrderFeedActions";
import PageHero from "@/components/PageHero";
import PageTools from "@/components/PageTools";
import SafeHtml from "@/components/SafeHtml";
import { isLang, locales } from "@/lib/i18n";
import { getPost, getRecentPostIds } from "@/lib/content";
import { formatDate, pick, getUi } from "@/lib/queries";
import { navTitle } from "@/lib/nav";

type Props = { params: Promise<{ lang: string; id: string }> };

export async function generateStaticParams() {
  const ids = await getRecentPostIds(20);
  return locales.flatMap((lang) => ids.map((id) => ({ lang, id: String(id) })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, id } = await params;
  if (!isLang(lang) || !/^\d+$/.test(id)) return {};
  const post = await getPost(Number(id));
  return post ? { title: pick(lang, post.titleEn, post.titleHi, post.i18n?.title) } : {};
}

const fileName = (url: string) => {
  try {
    return decodeURIComponent(url.split("/").pop() ?? url).replace(/\.(pdf|docx?|xlsx?)$/i, "");
  } catch {
    return url;
  }
};

export default function OrderPage({ params }: Props) {
  return (
    <Suspense fallback={<PageFallback />}>
      <OrderPageContent params={params} />
    </Suspense>
  );
}

async function OrderPageContent({ params }: Props) {
  const { lang, id } = await params;
  if (!isLang(lang) || !/^\d+$/.test(id)) notFound();
  const [post, ordersTitle] = await Promise.all([getPost(Number(id)), navTitle(lang, "/orders")]);
  if (!post) notFound();
  const ui = await getUi(lang);
  const title = pick(lang, post.titleEn, post.titleHi, post.i18n?.title);

  return (
    <>
      <PageHero lang={lang} title={title} crumbs={[{ href: `/${lang}`, label: ui.home }, { href: `/${lang}/orders`, label: ordersTitle }, { label: formatDate(post.publishedAt, lang) }]} />
      <article className="mx-auto grid max-w-wrap gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-6">
          <div className="rounded-none border border-line bg-white p-6 sm:p-10">
            <SafeHtml html={post.contentHtml} />
          </div>
          {/* likes and comments are per visitor; the order above stays a pre-built page */}
          <Suspense fallback={<div className="mt-2 h-28 border-t border-line" aria-busy="true" />}>
            <OrderFeedActions lang={lang} id={post.id} />
          </Suspense>
        </div>
        <aside className="space-y-5">
          {/* the order's details as label and value rows between hairlines, then the tools, then the way back */}
          <div>
            <dl className="border-t border-line">
              <div className="flex justify-between gap-3 border-b border-line py-3.5">
                <dt className="text-sm text-muted">{ui.issuedOn}</dt>
                <dd className="text-right text-[0.95rem] font-medium">{formatDate(post.publishedAt, lang)}</dd>
              </div>
              {post.cats.length > 0 && (
                <div className="flex justify-between gap-3 border-b border-line py-3.5">
                  <dt className="text-sm text-muted">{ui.category}</dt>
                  <dd className="flex flex-wrap justify-end gap-x-3 text-right text-[0.95rem] font-medium">
                    {post.cats.map((c) => (
                      <Link key={c.id} href={`/${lang}/orders?cat=${c.slug}`} className="text-brand hover:underline">
                        {pick(lang, c.nameEn, c.nameHi, c.i18n?.name)}
                      </Link>
                    ))}
                  </dd>
                </div>
              )}
            </dl>
            <div className="border-b border-line py-3.5 print:hidden">
              <PageTools print={ui.print} share={ui.share} copied={ui.copied} />
            </div>
          </div>
          {post.files.length > 0 && (
            <div className="border border-line border-t-[3px] border-t-brand bg-white p-5">
              <h2 className="font-display text-lg font-semibold">{ui.attachments}</h2>
              <ul className="mt-3 space-y-2">
                {post.files.map((f) => (
                  <li key={f.url}>
                    <a href={f.url.replace(/^http:/, "https:")} target="_blank" rel="noopener noreferrer" className="group flex items-start gap-3 border border-line p-3 hover:border-brand hover:bg-paper">
                      <Icon name="pdf" className="mt-0.5 shrink-0 text-brand" />
                      <span className="min-w-0">
                        <span className="line-clamp-2 break-words text-sm font-semibold group-hover:text-brand">{f.name || fileName(f.url)}</span>
                        <span className="text-sm text-muted">{ui.download}</span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <Link href={`/${lang}/orders`} className="-my-2 inline-flex min-h-11 items-center gap-2 font-semibold text-brand hover:underline print:hidden">
            <Icon name="arrow" size={16} className="rotate-180" />
            {ui.backToOrders}
          </Link>
        </aside>
      </article>
    </>
  );
}
