import Image from "next/image";
import Link from "next/link";
import Icon from "@/components/Icon";
import { feedKey, type FeedItem, type FeedState } from "@/lib/feed";
import { intlLocale, type Lang } from "@/lib/i18n";
import { fill, pickText } from "@/lib/text3";
import FeedActions, { type FeedLabels } from "./FeedActions";
import FeedMedia from "./FeedMedia";

export const initials = (name: string) =>
  name
    .replace(/^(Sh|Shri|Smt|Dr|Com|Km)\.?\s+/i, "")
    .split(/[\s.]+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

export type CardText = {
  org: string;
  official: string;
  anonName: string;
  anonNoDiv: string;
  openOrder: string;
  viewPost: string;
  pdf: string;
  download: string;
  newTab: string;
  close: string;
};

/**
 * Short time of an item, as on social apps: the clock time for today, the day and month for this year, the full date
 * before that. An order without a time of its own (it sorts at midnight India time) always shows its date.
 */
export function shortWhen(iso: string, lang: Lang, dateOnly: boolean) {
  const d = new Date(iso);
  const loc = intlLocale(lang);
  const day = (x: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(x);
  const year = (x: Date) => new Intl.DateTimeFormat("en", { year: "numeric", timeZone: "Asia/Kolkata" }).format(x);
  const now = new Date();
  if (!dateOnly && day(d) === day(now)) return new Intl.DateTimeFormat(loc, { timeStyle: "short", timeZone: "Asia/Kolkata" }).format(d);
  if (year(d) === year(now)) return new Intl.DateTimeFormat(loc, { day: "numeric", month: "short", timeZone: "Asia/Kolkata" }).format(d);
  return new Intl.DateTimeFormat(loc, { dateStyle: "medium", timeZone: "Asia/Kolkata" }).format(d);
}

/** The author's picture: the union's logo, the initials of a named member, or a plain figure when the name is hidden. */
export function Avatar({ item, size = "h-11 w-11" }: { item: FeedItem; size?: string }) {
  if (item.target === "order") return <Image src="/logo.jpg" alt="" width={48} height={48} className={`${size} shrink-0 rounded-full`} />;
  if (item.author)
    return (
      <span aria-hidden className={`${size} grid shrink-0 place-items-center rounded-full bg-[#f2e6cc] text-[0.95rem] font-semibold text-brand`}>
        {initials(item.author)}
      </span>
    );
  return (
    <span aria-hidden className={`${size} grid shrink-0 place-items-center rounded-full bg-paper text-muted`}>
      <Icon name="user" size={20} />
    </span>
  );
}

/** The gold tick and word marking the union's own posts. `compact` keeps only the tick on phones, for narrow cards. */
export function OfficialBadge({ label, compact = false }: { label: string; compact?: boolean }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 text-[0.8rem] font-semibold text-[#8a6a1f]">
      <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="#c8a45a">
        <path d="M12 2l2.4 2.2 3.2-.4.9 3.1 2.9 1.5-1 3 1 3-2.9 1.5-.9 3.1-3.2-.4L12 22l-2.4-2.2-3.2.4-.9-3.1-2.9-1.5 1-3-1-3 2.9-1.5.9-3.1 3.2.4z" />
        <path d="m8.5 12 2.3 2.3 4.7-4.7" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {compact ? <span className="max-sm:sr-only">{label}</span> : label}
    </span>
  );
}

/**
 * One item of the wall, laid out as on X: the picture in a narrow column on the left; on the right a single line with
 * the name, badge, time and topic, then the words, the photos and videos in a rounded frame, and the action icons.
 * No box around it; items are parted by a hairline. No hover effects.
 */
export default function FeedCard({
  lang,
  item,
  state,
  me,
  text: T,
  labels,
  commentMax,
  open = false,
  guestLikes = false,
}: {
  lang: Lang;
  item: FeedItem;
  state: FeedState;
  me: number | null;
  text: CardText;
  labels: FeedLabels;
  commentMax: number;
  /** show the comments from the start (the item's own page) */
  open?: boolean;
  /** visitors who are not signed in may like */
  guestLikes?: boolean;
}) {
  const s = state[feedKey(item.target, item.id)] ?? { likes: 0, comments: 0, liked: false };
  const isOrder = item.target === "order";
  const istMidnight = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata" }).format(new Date(item.at)) === "00:00";
  const when = shortWhen(item.at, lang, isOrder && istMidnight);
  const full = new Intl.DateTimeFormat(intlLocale(lang), { dateStyle: "full", ...(isOrder && istMidnight ? {} : { timeStyle: "short" }), timeZone: "Asia/Kolkata" }).format(new Date(item.at));
  const author = isOrder ? T.org : item.author ?? (item.division ? fill(T.anonName, { division: pickText(lang, item.division) }) : T.anonNoDiv);
  const tag = isOrder ? pickText(lang, item.label) : pickText(lang, item.topic);
  const href = isOrder ? `/${lang}/orders/${item.id}` : `/${lang}/feed/post/${item.id}`;
  const media = isOrder && !item.media.some((m) => m.kind !== "file") && item.thumbUrl ? [{ url: item.thumbUrl, kind: "image" as const, name: null }, ...item.media] : item.media;
  const title = isOrder ? pickText(lang, item.title) : "";

  return (
    <article className="flex gap-3 border-b border-line px-4 pt-4 sm:gap-4 sm:px-5">
      <Avatar item={item} />
      <div className="min-w-0 flex-1">
        <header className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[0.95rem] leading-tight">
          <span className="truncate font-bold">{author}</span>
          {isOrder && <OfficialBadge label={T.official} />}
          <span aria-hidden className="text-muted">·</span>
          {/* the time opens the item on its own page, as on X */}
          <Link href={href} className="text-muted">
            <time dateTime={item.at} title={full}>
              {when}
            </time>
          </Link>
          {tag && (
            <>
              <span aria-hidden className="text-muted">·</span>
              <span className="truncate font-medium text-brand">{isOrder ? tag : `#${tag}`}</span>
            </>
          )}
        </header>

        <div className="mt-1.5">
          {isOrder ? (
            <>
              <h2 className="text-[1.02rem] font-semibold leading-snug">
                <Link href={href}>{title}</Link>
              </h2>
              {item.excerpt && item.excerpt !== title && <p className="mt-1 line-clamp-3 text-[0.97rem] leading-relaxed text-ink/75">{item.excerpt}</p>}
            </>
          ) : (
            <p className="whitespace-pre-line break-words text-[1.02rem] leading-relaxed">{item.body}</p>
          )}
        </div>

        {media.length > 0 && (
          <div className="mt-3">
            <FeedMedia media={media} alt={isOrder ? title : ""} fileLabel={T.pdf} fileText={{ download: T.download, newTab: T.newTab, close: T.close }} />
          </div>
        )}

        <FeedActions
          lang={lang}
          target={item.target}
          id={item.id}
          likes={s.likes}
          comments={s.comments}
          liked={s.liked}
          me={me}
          labels={labels}
          commentMax={commentMax}
          loginHref={`/${lang}/member/login`}
          startOpen={open}
          sharePath={href}
          shareTitle={isOrder ? title : item.body.slice(0, 80)}
          canLike={guestLikes}
        />
      </div>
    </article>
  );
}
