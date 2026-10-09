import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import PageFallback from "@/components/PageFallback";
import type { Metadata } from "next";
import Icon from "@/components/Icon";
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
  return post ? { title: pick(lang, post.titleEn, post.titleHi) } : {};
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
  const title = pick(lang, post.titleEn, post.titleHi);

  return (
    <>
      <PageHero lang={lang} title={title} crumbs={[{ href: `/${lang}`, label: ui.home }, { href: `/${lang}/orders`, label: ordersTitle }, { label: formatDate(post.publishedAt, lang) }]} />
      <article className="mx-auto grid max-w-wrap gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 rounded-none border border-line bg-white p-6 sm:p-10">
          <SafeHtml html={post.contentHtml} />
        </div>
        <aside className="space-y-5">
          <div className="rounded-none border border-line bg-white p-5">
            <p className="text-sm text-muted">{formatDate(post.publishedAt, lang)}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {post.cats.map((c) => (
                <Link key={c.id} href={`/${lang}/orders?cat=${c.slug}`} className="border border-line px-2.5 py-1 text-sm text-brand hover:border-brand">
                  {pick(lang, c.nameEn, c.nameHi)}
                </Link>
              ))}
            </div>
          </div>
          {post.files.length > 0 && (
            <div className="rounded-none border-2 border-ink bg-white p-5">
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
          <PageTools print={ui.print} share={ui.share} copied={ui.copied} />
          <Link href={`/${lang}/orders`} className="block rounded-full border-2 border-ink px-5 py-2.5 text-center font-bold hover:bg-ink hover:text-white">
            ← {ui.backToOrders}
          </Link>
        </aside>
      </article>
    </>
  );
}
