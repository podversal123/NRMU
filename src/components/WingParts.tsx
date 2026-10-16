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

/** The line under the page title plus one chip per section, which jumps to it and says how much is in it. */
export function WingIntro({ sub, chips }: { sub: string; chips: { href: string; label: string; count?: number }[] }) {
  return (
    <div className="mx-auto max-w-wrap px-5 sm:px-8">
      {sub && <p className="mt-2 max-w-2xl text-lg text-muted">{sub}</p>}
      <nav className="mt-6 flex flex-wrap gap-2.5">
        {chips.map((c) => (
          <a key={c.href} href={c.href} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-white px-4 text-sm font-medium text-ink shadow-sm transition-colors hover:border-brand hover:text-brand">
            {c.count !== undefined && <span className="grid min-w-7 place-items-center rounded-full bg-signal/25 px-2 py-0.5 text-xs font-bold text-ink">{c.count}</span>}
            {c.label}
          </a>
        ))}
      </nav>
    </div>
  );
}

/** Section title with the red rule above it and an optional count next to it. */
export function WingHeading({ title, count }: { title: string; count?: number }) {
  return (
    <div className="mb-6">
      <h2 className="flex items-center gap-3 text-2xl font-semibold">
        {title}
        {count !== undefined && <span className="rounded-full bg-brand/10 px-2.5 py-0.5 text-sm font-bold text-brand">{count}</span>}
      </h2>
    </div>
  );
}

/** Shown while a wing has no committee list yet: a calm placeholder card instead of a bare line of text. */
export function WingEmpty({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-dashed border-line bg-paper/60 px-5 py-6 sm:px-7">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white text-brand shadow-sm">
        <Icon name="people" />
      </span>
      <p className="text-muted">{text}</p>
    </div>
  );
}

/** Links to the committee pages of a wing, as horizontal cards. */
export function CommitteeLinks({ pages, lang, base }: { pages: { slug: string; titleEn: string; titleHi: string | null; i18n: I18n }[]; lang: Lang; base: string }) {
  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {pages.map((p) => (
        <li key={p.slug} className="min-w-0">
          <Link href={`/${lang}/${base}/${p.slug}`} className="group flex h-full items-stretch overflow-hidden rounded-lg border border-line bg-white shadow-sm transition hover:shadow-lg">
            <span className="grid w-16 shrink-0 place-items-center bg-gradient-to-br from-brand to-brand-deep text-signal sm:w-20">
              <Icon name="people" size={26} />
            </span>
            <span className="flex min-w-0 flex-1 items-center justify-between gap-3 px-5 py-4">
              <span className="min-w-0 break-words font-semibold leading-snug">{calmTitle(pick(lang, p.titleEn, p.titleHi, p.i18n?.title))}</span>
              <Icon name="arrow" size={20} className="shrink-0 text-brand transition group-hover:translate-x-1" />
            </span>
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

/** Reports and events of a wing, newest first, grouped under their year, each with a date block. */
export function ActivityList({ rows, lang }: { rows: CardRow[]; lang: Lang }) {
  const years: { year: string; rows: CardRow[] }[] = [];
  for (const r of rows) {
    const y = r.publishedAt.slice(0, 4);
    let g = years.find((x) => x.year === y);
    if (!g) years.push((g = { year: y, rows: [] }));
    g.rows.push(r);
  }
  const day = new Intl.DateTimeFormat(intlLocale(lang), { day: "2-digit" });
  const month = new Intl.DateTimeFormat(intlLocale(lang), { month: "short" });
  const yearFmt = (y: string) => Number(y).toLocaleString(intlLocale(lang), { useGrouping: false });
  return (
    <div className="space-y-8">
      {years.map((g) => (
        <div key={g.year} className="grid gap-4 md:grid-cols-[5rem_1fr]">
          <p className="text-2xl font-bold text-brand/80 md:pt-3">{yearFmt(g.year)}</p>
          <ul className="grid gap-3 lg:grid-cols-2">
            {g.rows.map((r) => {
              const d = new Date(r.publishedAt.slice(0, 10) + "T00:00:00");
              return (
                <li key={r.id} className="min-w-0">
                  <Link href={`/${lang}/orders/${r.id}`} className="group flex h-full items-stretch overflow-hidden rounded-lg border border-line bg-white shadow-sm transition hover:shadow-lg">
                    <span className="flex w-16 shrink-0 flex-col items-center justify-center bg-paper text-center">
                      <span className="text-2xl font-bold leading-none text-brand">{day.format(d)}</span>
                      <span className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted">{month.format(d)}</span>
                    </span>
                    <span className="flex min-w-0 flex-1 items-center justify-between gap-3 px-4 py-3.5">
                      <span className="line-clamp-2 min-w-0 font-medium leading-snug group-hover:text-brand">{calmTitle(pick(lang, r.titleEn, r.titleHi, r.i18n?.title))}</span>
                      <Icon name="arrow" size={18} className="shrink-0 text-brand transition group-hover:translate-x-1" />
                    </span>
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
