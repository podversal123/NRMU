import Link from "next/link";
import Icon from "@/components/Icon";
import type { CardRow } from "@/lib/content";
import { intlLocale, type I18n, type Lang } from "@/lib/i18n";
import { pick } from "@/lib/queries";

/* Building blocks shared by the Women Wing and Youth Wing pages. */

const ACRONYMS = new Set(["NRMU", "AIRF", "NR", "AGC", "DRM", "HQ", "LKO", "NDLS"]);

/**
 * Many titles from the old site are typed in capitals ("WOMEN COMMITTEE LUCKNOW DIVISION, NRMU"). Those read
 * as shouting, so a title that is almost all capitals is shown in title case, keeping known short forms as they are.
 */
export function calmTitle(s: string) {
  const letters = s.replace(/[^A-Za-z]/g, "");
  if (letters.length < 4 || letters.replace(/[^A-Z]/g, "").length / letters.length < 0.8) return s;
  let first = true;
  return s.replace(/[A-Za-z][A-Za-z.'&-]*/g, (w) => {
    const bare = w.replace(/[^A-Za-z]/g, "").toUpperCase();
    const out = ACRONYMS.has(bare) ? w.toUpperCase() : !first && SMALL.has(bare) ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1).toLowerCase();
    first = false;
    return out;
  });
}
const SMALL = new Set(["OF", "AND", "THE", "AT", "ON", "IN", "BY", "FOR", "TO", "A", "AN"]);

/** The line under the page title. */
export function WingIntro({ sub }: { sub: string }) {
  if (!sub) return null;
  return (
    <div className="mx-auto max-w-wrap px-5 sm:px-8">
      <p className="mt-2 max-w-2xl text-lg text-muted">{sub}</p>
    </div>
  );
}

/** Section title with an optional count after it in small grey figures. */
export function WingHeading({ title, count }: { title: string; count?: number }) {
  return (
    <h2 className="mb-3.5 flex items-baseline gap-2.5 text-[1.375rem] font-semibold">
      {title}
      {count !== undefined && <span className="text-sm font-medium tabular-nums text-muted">{count}</span>}
    </h2>
  );
}

/** Shown while a section has nothing in it yet: one quiet line between hairlines. */
export function WingEmpty({ text }: { text: string }) {
  return <p className="border-y border-line py-3.5 text-muted">{text}</p>;
}

/** Links to the committee pages of a wing: a list in two columns between hairlines, each a name and a chevron. */
export function CommitteeLinks({ pages, lang, base }: { pages: { slug: string; titleEn: string; titleHi: string | null; i18n: I18n }[]; lang: Lang; base: string }) {
  return (
    <ul className="grid border-t border-line md:grid-cols-2 md:gap-x-10">
      {pages.map((p) => (
        <li key={p.slug} className="min-w-0 border-b border-line">
          <Link href={`/${lang}/${base}/${p.slug}`} className="group flex h-full items-center justify-between gap-3 py-3.5 font-medium">
            <span className="min-w-0 break-words leading-snug group-hover:text-brand">{calmTitle(pick(lang, p.titleEn, p.titleHi, p.i18n?.title))}</span>
            <Icon name="chevron" size={16} className="shrink-0 text-brand" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Side list on a committee page: the other committees of the wing, with the open one marked. */
export function CommitteeSideNav({ pages, lang, base, current, title, back }: { pages: { slug: string; titleEn: string; titleHi: string | null; i18n: I18n }[]; lang: Lang; base: string; current: string; title: string; back: string }) {
  return (
    <nav aria-label={title} className="overflow-hidden rounded-lg border border-line bg-white shadow-sm">
      <p className="bg-gradient-to-br from-brand to-brand-deep px-5 py-3.5 font-semibold text-white">{title}</p>
      <ul className="divide-y divide-line">
        {pages.map((p) => {
          const here = p.slug === current;
          return (
            <li key={p.slug}>
              <Link
                href={`/${lang}/${base}/${p.slug}`}
                aria-current={here ? "page" : undefined}
                className={`flex min-h-11 items-center gap-2 px-5 py-3 text-sm leading-snug transition-colors ${here ? "border-l-4 border-signal bg-paper pl-4 font-semibold text-brand" : "hover:bg-paper hover:text-brand"}`}
              >
                {calmTitle(pick(lang, p.titleEn, p.titleHi, p.i18n?.title))}
              </Link>
            </li>
          );
        })}
      </ul>
      <Link href={`/${lang}/${base}`} className="flex min-h-11 items-center gap-2 border-t border-line px-5 py-3 text-sm font-medium text-brand hover:bg-paper">
        <Icon name="arrow" size={16} className="rotate-180" /> {back}
      </Link>
    </nav>
  );
}

/** Reports and events of a wing, newest first, in one column between hairlines, with the year above each group. */
export function ActivityList({ rows, lang }: { rows: CardRow[]; lang: Lang }) {
  const years: { year: string; rows: CardRow[] }[] = [];
  for (const r of rows) {
    const y = r.publishedAt.slice(0, 4);
    let g = years.find((x) => x.year === y);
    if (!g) years.push((g = { year: y, rows: [] }));
    g.rows.push(r);
  }
  const dayMonth = new Intl.DateTimeFormat(intlLocale(lang), { day: "2-digit", month: "short" });
  const yearFmt = (y: string) => Number(y).toLocaleString(intlLocale(lang), { useGrouping: false });
  return (
    <div className="max-w-[55rem] border-t border-line">
      {years.map((g) => (
        <div key={g.year}>
          <h3 className="pb-1.5 pt-[1.125rem] text-[0.8rem] font-semibold tracking-wide text-brand">{yearFmt(g.year)}</h3>
          <ul>
            {g.rows.map((r) => {
              const d = new Date(r.publishedAt.slice(0, 10) + "T00:00:00");
              return (
                <li key={r.id} className="border-b border-line">
                  <Link href={`/${lang}/orders/${r.id}`} className="group grid grid-cols-[4.75rem_1fr_1rem] items-center gap-3 py-3.5">
                    <time dateTime={r.publishedAt.slice(0, 10)} className="text-sm tabular-nums text-muted">
                      {dayMonth.format(d)}
                    </time>
                    <span className="min-w-0 font-medium leading-snug group-hover:text-brand">{calmTitle(pick(lang, r.titleEn, r.titleHi, r.i18n?.title))}</span>
                    <Icon name="chevron" size={16} className="text-brand" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
