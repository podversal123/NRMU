import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import Breadcrumb from "@/components/Breadcrumb";
import Composer from "@/components/feed/Composer";
import FeedCard from "@/components/feed/FeedCard";
import { cardText, composerText, feedLabels } from "@/components/feed/labels";
import { feedConfig, getFeedPage, getFeedState, getFeedTopics, type FeedFilter } from "@/lib/feed";
import { isLang, type Lang } from "@/lib/i18n";
import { getMember } from "@/lib/member-auth";
import { visitorHash } from "@/lib/visitor";
import { navTitle } from "@/lib/nav";
import { getSettings, getUi, setting } from "@/lib/queries";
import { pickText } from "@/lib/text3";

type SP = Promise<Record<string, string | string[] | undefined>>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return { title: isLang(lang) ? await navTitle(lang, "/feed") : undefined };
}

export default async function FeedPage({ params, searchParams }: { params: Promise<{ lang: string }>; searchParams: SP }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const [ui, title] = await Promise.all([getUi(lang), navTitle(lang, "/feed")]);
  return (
    <>
      {/* the breadcrumb and the title start at the page's left edge, as on every inner page, with the wall's column under them */}
      <div className="mx-auto max-w-wrap px-5 pt-6 sm:px-8 sm:pt-8">
        <Breadcrumb label={ui.breadcrumb} crumbs={[{ href: `/${lang}`, label: ui.home }, { label: title }]} />
        <h1 className="mt-3 text-[1.6rem] font-bold leading-tight text-ink md:text-[1.85rem]">{title}</h1>
        <p className="mt-1 text-muted">{ui.fdTagline}</p>
      </div>
      {/* the list depends on the address and on who is signed in, so it is rendered per request inside this boundary */}
      <Suspense fallback={<div className="mx-auto max-w-wrap px-5 py-20 sm:px-8" aria-busy="true" />}>
        <FeedBody lang={lang} title={title} searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function FeedBody({ lang, title, searchParams }: { lang: Lang; title: string; searchParams: SP }) {
  const sp = await searchParams;
  const fromRaw = first(sp.from);
  const topic = Number(first(sp.topic)) || undefined;
  const before = first(sp.before) ?? null;
  const [ui, s, cfg, topics, member] = await Promise.all([getUi(lang), getSettings(), feedConfig(), getFeedTopics(), getMember()]);
  const from: FeedFilter["from"] = topic ? "members" : fromRaw === "union" && cfg.includeOrders ? "union" : fromRaw === "members" ? "members" : "all";

  const page = await getFeedPage({ from, ...(topic ? { topic } : {}) }, before);
  const state = await getFeedState(page.items, member?.id ?? null, member ? null : await visitorHash());
  const labels = feedLabels(ui);
  const text = cardText(ui, setting(s, "org.short", lang));

  const href = (over: { from?: string; topic?: number; before?: string | null }) => {
    const p = new URLSearchParams();
    const f = over.from ?? from;
    if (f !== "all") p.set("from", f);
    if (over.topic) p.set("topic", String(over.topic));
    if (over.before) p.set("before", over.before);
    const qs = p.toString();
    return `/${lang}/feed${qs ? `?${qs}` : ""}`;
  };
  const tab = (on: boolean) => `relative flex min-h-[3.25rem] flex-1 items-center justify-center whitespace-nowrap px-2 text-sm font-semibold sm:text-[0.95rem] ${on ? "text-ink" : "text-muted"}`;
  const bar = <span aria-hidden className="absolute bottom-0 left-1/2 h-1 w-14 -translate-x-1/2 rounded-full bg-brand" />;

  return (
    // laid out as on X: one column of posts between hairlines, opened by the tabs and topics; it keeps to the page's left edge
    <div className="mx-auto mt-3 max-w-wrap pb-10 sm:px-8">
      <section aria-label={title} className="min-w-0 max-w-[42rem] border-line bg-white sm:rounded-t-2xl sm:border-x sm:border-y">
        <nav aria-label={title} className="sticky top-[var(--below-header,5.75rem)] z-10 border-b border-line bg-white transition-[top] duration-300 motion-reduce:transition-none sm:rounded-t-2xl lg:top-[var(--below-header,5.25rem)]">
          <ul className="flex">
            <li className="flex flex-1">
              <Link href={href({ from: "all" })} aria-current={from === "all" && !topic ? "page" : undefined} className={tab(from === "all" && !topic)}>
                {ui.fdAll}
                {from === "all" && !topic && bar}
              </Link>
            </li>
            {cfg.includeOrders && (
              <li className="flex flex-1">
                <Link href={href({ from: "union" })} aria-current={from === "union" ? "page" : undefined} className={tab(from === "union")}>
                  {ui.fdFromUnion}
                  {from === "union" && bar}
                </Link>
              </li>
            )}
            <li className="flex flex-1">
              <Link href={href({ from: "members" })} aria-current={from === "members" ? "page" : undefined} className={tab(from === "members")}>
                {ui.fdFromMembers}
                {from === "members" && bar}
              </Link>
            </li>
          </ul>
        </nav>

        {/* topics: a quiet row of plain links under the tabs, named by a small label; the chosen one is underlined */}
        {topics.length > 0 && (
          <div className="flex items-center gap-5 overflow-x-auto border-b border-line px-5 py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <span id="wall-topics" className="shrink-0 text-[0.8rem] text-muted">
              {ui.fdTopics}
            </span>
            <ul aria-labelledby="wall-topics" className="flex gap-5">
              {topics.map((t) => (
                <li key={t.id}>
                  <Link
                    href={href({ from: "members", topic: t.id })}
                    aria-current={topic === t.id ? "page" : undefined}
                    className={`inline-flex min-h-10 shrink-0 items-center whitespace-nowrap text-[0.9rem] font-medium hover:text-brand ${topic === t.id ? "text-brand underline decoration-2 underline-offset-[6px]" : "text-ink/85"}`}
                  >
                    {pickText(lang, t.name)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {member ? (
          <div className="border-b border-line">
            <Composer
              memberId={member.id}
              name={member.name}
              topics={topics.map((t) => ({ value: String(t.id), label: pickText(lang, t.name) }))}
              limits={{ postMax: cfg.postMax, maxMedia: cfg.maxMedia, maxImageMb: cfg.maxImageMb, maxVideoMb: cfg.maxVideoMb }}
              text={composerText(ui)}
            />
          </div>
        ) : null}


        {page.items.length === 0 ? (
          <p className="px-5 py-16 text-center text-muted">{ui.noItems}</p>
        ) : (
          page.items.map((item) => <FeedCard key={`${item.target}-${item.id}`} lang={lang} item={item} state={state} me={member?.id ?? null} text={text} labels={labels} commentMax={cfg.commentMax} guestLikes={cfg.guestLikes} />)
        )}

        {(before || page.next) && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-5">
            {before ? (
              <Link href={href({ topic, before: null })} className="inline-flex min-h-11 items-center font-semibold text-brand">
                ← {title}
              </Link>
            ) : (
              <span />
            )}
            {page.next && (
              <Link href={href({ topic, before: page.next })} className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 font-semibold text-white">
                {ui.fdLoadMore} →
              </Link>
            )}
          </div>
        )}
      </section>
    </div>
  );
}