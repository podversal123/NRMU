import Link from "next/link";
import Icon from "@/components/Icon";
import Photo from "@/components/Photo";
import { feedConfig, feedKey, getFeedPage, getPublicCounts, type FeedItem } from "@/lib/feed";
import { intlLocale, type Lang } from "@/lib/i18n";
import { navTitle } from "@/lib/nav";
import { getSettings, getUi, setting } from "@/lib/queries";
import { fill, pickText } from "@/lib/text3";
import { Avatar, OfficialBadge } from "./FeedCard";
import StripScroller from "./StripScroller";

/** The first photo or video of an item, if it has one (an order without attached pictures may still have one in its text). */
const cover = (item: FeedItem) => item.media.find((m) => m.kind === "image" || m.kind === "video") ?? (item.target === "order" && item.thumbUrl ? { url: item.thumbUrl, kind: "image" as const, name: null } : null);

/**
 * The home page's look at the wall: the newest items as cards in a row that scrolls sideways, and a button to the
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
    <section aria-labelledby="wall-title" className="overflow-x-clip border-t border-line bg-paper/60 py-12 lg:py-14">
      <div className="mx-auto max-w-wrap px-5 sm:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 id="wall-title" className="flex items-center gap-2.5 text-xl font-semibold leading-tight sm:text-2xl">
            <span aria-hidden className="h-5 w-1 shrink-0 rounded-full bg-brand" />
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

        <StripScroller label={title} prev={ui.previous} next={ui.next}>
          {items.map((item) => {
            const c = counts[feedKey(item.target, item.id)] ?? { likes: 0, comments: 0 };
            const isOrder = item.target === "order";
            const href = isOrder ? `/${lang}/orders/${item.id}` : `/${lang}/feed/post/${item.id}`;
            const author = isOrder ? org : item.author ?? (item.division ? fill(ui.fdAnonName, { division: pickText(lang, item.division) }) : ui.fdAnonNoDiv);
            const text = isOrder ? pickText(lang, item.title) : item.body;
            const pic = cover(item);
            const tag = isOrder ? pickText(lang, item.label) : pickText(lang, item.topic);
            return (
              // a card like a post on X: who and when, the words, the picture in a rounded frame, the totals
              <li key={`${item.target}-${item.id}`} className="w-[18.5rem] shrink-0 snap-start sm:w-[21rem]">
                <Link href={href} className="flex h-full flex-col rounded-2xl border border-line bg-white p-4">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Avatar item={item} size="h-10 w-10" />
                    <div className="min-w-0 leading-tight">
                      <p className="flex min-w-0 items-center gap-1.5">
                        <span className="truncate text-[0.95rem] font-bold">{author}</span>
                        {isOrder && <OfficialBadge label={ui.fdOfficial} />}
                      </p>
                      <p className="mt-0.5 truncate text-sm text-muted">
                        <time dateTime={item.at}>{date(item.at)}</time>
                        {tag && <span className="text-brand"> · {isOrder ? tag : `#${tag}`}</span>}
                      </p>
                    </div>
                  </div>
                  {/* every card in the row is as tall as the tallest, with the totals held at the bottom so they line up */}
                  <p className={`mt-3 text-[0.97rem] leading-snug ${pic ? "line-clamp-3" : "line-clamp-6"} ${isOrder ? "font-semibold" : ""}`}>{text}</p>
                  {pic && (
                    <div className="relative mt-3 aspect-[16/9] overflow-hidden rounded-xl border border-line bg-paper">
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
                        <Photo src={pic.url} alt="" fill sizes="21rem" className="object-cover" />
                      )}
                    </div>
                  )}
                  <p className="mt-auto flex items-center gap-6 pt-3 text-sm text-muted">
                    <span className="inline-flex items-center gap-1.5" aria-label={fill(ui.fdCommentsCount, { n: c.comments })}>
                      <Icon name="chat" size={17} />
                      <span className="tabular-nums">{num(c.comments)}</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5" aria-label={fill(ui.fdLikesCount, { n: c.likes })}>
                      <Icon name="heart" size={17} />
                      <span className="tabular-nums">{num(c.likes)}</span>
                    </span>
                  </p>
                </Link>
              </li>
            );
          })}
        </StripScroller>
      </div>
    </section>
  );
}
