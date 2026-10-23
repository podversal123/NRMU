import Link from "next/link";
import Icon from "@/components/Icon";
import Photo from "@/components/Photo";
import { feedConfig, feedKey, getFeedPage, getPublicCounts, type FeedItem } from "@/lib/feed";
import { intlLocale, type Lang } from "@/lib/i18n";
import { navTitle } from "@/lib/nav";
import { getSettings, getUi, setting } from "@/lib/queries";
import { fill, pickText } from "@/lib/text3";
import { Avatar, OfficialBadge } from "./FeedCard";

/** The first photo or video of an item, if it has one (an order without attached pictures may still have one in its text). */
const cover = (item: FeedItem) => item.media.find((m) => m.kind === "image" || m.kind === "video") ?? (item.target === "order" && item.thumbUrl ? { url: item.thumbUrl, kind: "image" as const, name: null } : null);

/**
 * The home page's look at the wall: the newest items as cards running past in a marquee, and a button to the
 * whole wall. Its title is the wall's own menu name, so a rename in the admin shows here too. The same for every
 * visitor, so it is cached with the page; the like and comment totals are a few minutes old at most.
 */
export default async function WallStrip({ lang }: { lang: Lang }) {
  const cfg = await feedConfig();
  if (cfg.homeCount === 0) return null;
  const [page, ui, s, title] = await Promise.all([getFeedPage({ from: "all" }, null), getUi(lang), getSettings(), navTitle(lang, "/feed")]);
  const items = page.items.slice(0, cfg.homeCount);
  if (!items.length) return null;
  const counts = await getPublicCounts(items.map((i) => ({ target: i.target, id: i.id })));
  const org = setting(s, "org.short", lang);
  const num = (n: number) => n.toLocaleString(intlLocale(lang));
  const date = (iso: string) => new Intl.DateTimeFormat(intlLocale(lang), { day: "numeric", month: "short", timeZone: "Asia/Kolkata" }).format(new Date(iso));

  return (
    <section aria-labelledby="wall-title" className="overflow-x-clip pb-8 pt-14 lg:pb-10 lg:pt-16">
      <div className="mx-auto mb-7 flex max-w-wrap flex-wrap items-center justify-between gap-3 px-5 sm:px-8">
        <h2 id="wall-title" className="flex items-center gap-3 text-2xl font-bold leading-tight lg:text-[2rem]">
          <span aria-hidden className="h-7 w-1.5 shrink-0 rounded-full bg-brand" />
          {title}
        </h2>
        <Link
          href={`/${lang}/feed`}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-brand pl-5 pr-4 text-sm font-semibold text-white shadow-[0_6px_16px_-8px_rgba(111,26,23,0.6)]"
        >
          {ui.viewAll}
          <span className="text-signal">
            <Icon name="arrow" size={16} />
          </span>
        </Link>
      </div>
      {/* the cards run past like the latest-updates ticker, twice over so the loop has no gap; the second copy is
          hidden from screen readers and the tab order. Hover or keyboard focus stops them. They run inside the page's
          width, with the same side margins as every other section. */}
      <div className="mx-auto max-w-wrap px-5 sm:px-8">
        <div className="wall-marquee" style={{ "--wall-dur": `${items.length * 9}s` } as React.CSSProperties}>
          <ul aria-label={title} className="wall-track">
            {[false, true].map((copy) => items.map((item) => {
              const c = counts[feedKey(item.target, item.id)] ?? { likes: 0, comments: 0 };
              const isOrder = item.target === "order";
              const href = isOrder ? `/${lang}/orders/${item.id}` : `/${lang}/feed/post/${item.id}`;
              const author = isOrder ? org : item.author ?? (item.division ? fill(ui.fdAnonName, { division: pickText(lang, item.division) }) : ui.fdAnonNoDiv);
              const text = isOrder ? pickText(lang, item.title) : item.body;
              const pic = cover(item);
              const tag = isOrder ? pickText(lang, item.label) : pickText(lang, item.topic);
              return (
                // a soft roomy card: an icon for the kind of item and its tag, the words, then who and when with the totals under a hairline
                <li key={`${copy ? "b" : "a"}-${item.target}-${item.id}`} aria-hidden={copy || undefined} className="w-[19rem] shrink-0 pe-5 sm:w-[23rem]">
                  <Link href={href} tabIndex={copy ? -1 : undefined} className="flex h-full flex-col rounded-[1.75rem] border border-line/70 bg-white p-6 shadow-[0_1px_2px_rgba(21,22,26,0.04),0_18px_40px_-24px_rgba(111,26,23,0.25)] sm:p-7">
                    <div className="flex items-center justify-between gap-3">
                      <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#f6eedb] text-[#a88436]">
                        <Icon name={isOrder ? "doc" : "chat"} size={20} />
                      </span>
                      {tag && <span className="truncate rounded-full bg-brand/[0.07] px-3 py-1 text-[0.78rem] font-semibold text-brand">{isOrder ? tag : `#${tag}`}</span>}
                    </div>
                    <p className={`mt-5 text-[1.05rem] leading-relaxed text-ink/90 ${pic ? "line-clamp-3" : "line-clamp-5"} ${isOrder ? "font-medium" : ""}`}>{text}</p>
                    {pic && (
                      <div className="relative mt-4 aspect-[16/9] overflow-hidden rounded-2xl bg-paper">
                        {pic.kind === "video" ? (
                          <>
                            <video src={pic.url} muted playsInline preload="metadata" className="h-full w-full bg-black object-cover" />
                            <span aria-hidden className="absolute inset-0 grid place-items-center">
                              <span className="grid size-11 place-items-center rounded-full bg-black/55 text-white">
                                <svg viewBox="0 0 24 24" className="ml-0.5 size-5" fill="currentColor">
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                              </span>
                            </span>
                          </>
                        ) : (
                          <Photo src={pic.url} alt="" fill sizes="23rem" className="object-cover" />
                        )}
                      </div>
                    )}
                    {/* every card in the row is as tall as the tallest, with this footer held at the bottom so they line up */}
                    <div className="mt-auto pt-6">
                      <div className="flex items-center justify-between gap-3 border-t border-line/70 pt-5">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="shrink-0 rounded-full ring-2 ring-soft ring-offset-2">
                            <Avatar item={item} size="h-10 w-10" />
                          </span>
                          <div className="min-w-0 leading-tight">
                            <p className="flex min-w-0 items-center gap-1.5">
                              <span className="truncate text-[0.95rem] font-bold">{author}</span>
                              {isOrder && <OfficialBadge label={ui.fdOfficial} compact />}
                            </p>
                            <p className="mt-1 text-[0.82rem] text-muted">
                              <time dateTime={item.at}>{date(item.at)}</time>
                            </p>
                          </div>
                        </div>
                        <p className="flex shrink-0 items-center gap-3 text-sm text-muted sm:gap-4">
                          <span className="inline-flex items-center gap-1.5" aria-label={fill(ui.fdCommentsCount, { n: c.comments })}>
                            <Icon name="chat" size={17} />
                            <span className="tabular-nums">{num(c.comments)}</span>
                          </span>
                          <span className="inline-flex items-center gap-1.5" aria-label={fill(ui.fdLikesCount, { n: c.likes })}>
                            <Icon name="heart" size={17} />
                            <span className="tabular-nums">{num(c.likes)}</span>
                          </span>
                        </p>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            }))}
          </ul>
        </div>
      </div>
    </section>
  );
}
