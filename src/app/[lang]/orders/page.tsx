import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import Icon from "@/components/Icon";
import PageHero from "@/components/PageHero";
import OrdersFilters, { type CatOption } from "./OrdersFilters";
import { intlLocale, isLang, type Lang } from "@/lib/i18n";
import { getCategoryTree, getYears, listPostsCached, PAGE_SIZE, queryPosts } from "@/lib/content";
import { getSettings, pick, setting, getUi } from "@/lib/queries";
import { navTitle } from "@/lib/nav";

type SP = Promise<Record<string, string | string[] | undefined>>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return { title: isLang(lang) ? await navTitle(lang, "/orders") : undefined };
}

export default async function OrdersPage({ params, searchParams }: { params: Promise<{ lang: string }>; searchParams: SP }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const [s, title] = await Promise.all([getSettings(), navTitle(lang, "/orders")]);
  return (
    <>
      <PageHero lang={lang} title={title} sub={setting(s, "orders.sub", lang)} crumbs={[{ href: `/${lang}`, label: (await getUi(lang)).home }, { label: title }]} />
      <Suspense fallback={<div className="mx-auto max-w-wrap px-5 py-20 sm:px-8" aria-busy="true" />}>
        <Results lang={lang} searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Results({ lang, searchParams }: { lang: Lang; searchParams: SP }) {
  const sp = await searchParams;
  const q = (first(sp.q) ?? "").trim().slice(0, 100);
  const cat = first(sp.cat) || undefined;
  const year = Number(first(sp.year)) || undefined;
  const page = Math.max(1, Number(first(sp.page)) || 1);
  const ui = await getUi(lang);

  const [data, tree, years] = await Promise.all([
    q ? queryPosts({ q, cat, year, page }) : listPostsCached({ cat, year, page }),
    getCategoryTree(),
    getYears(),
  ]);

  const activeCat = cat ? tree.find((c) => c.slug === cat) : undefined;
  const roots = tree
    .filter((c) => !c.parentId && !c.hidden)
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total);

  const href = (over: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    const merged = { q: q || undefined, cat, year, ...over };
    for (const [k, v] of Object.entries(merged)) if (v !== undefined && v !== "") p.set(k, String(v));
    const qs = p.toString();
    return `/${lang}/orders${qs ? `?${qs}` : ""}`;
  };

  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
  const filtered = Boolean(q || cat || year);

  const num = (n: number) => n.toLocaleString(intlLocale(lang));
  // dropdown options: each main category followed by its sub-categories
  const catOptions: CatOption[] = roots.flatMap((r) => [
    { slug: r.slug, label: pick(lang, r.nameEn, r.nameHi, r.i18n?.name) },
    ...tree
      .filter((c) => c.parentId === r.id && c.total > 0)
      .map((c) => ({ slug: c.slug, label: pick(lang, c.nameEn, c.nameHi, c.i18n?.name), parent: r.slug })),
  ]);

  return (
    <div className="mx-auto max-w-wrap px-5 py-6 sm:px-8 lg:py-8">
      <section className="min-w-0">
        <OrdersFilters
          cats={catOptions}
          years={years.map((y) => y.y)}
          labels={{ search: ui.searchOrders, clear: ui.clear, category: ui.category, allCategories: ui.allCategories, subCategory: ui.subCategoryPick, year: ui.year, allYears: ui.allYears }}
        />

        <div className="orders-list mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
          <p className="mr-1">
            <strong className="text-ink">{num(data.total)}</strong> {data.total === 1 ? ui.result : ui.results}
          </p>
          {activeCat && (
            <Link
              href={href({ cat: undefined, page: undefined })}
              className="inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand/[0.06] py-1 pl-3 pr-2 text-brand hover:border-brand"
            >
              {pick(lang, activeCat.nameEn, activeCat.nameHi, activeCat.i18n?.name)}
              <span aria-label={ui.clear} className="text-base leading-none">×</span>
            </Link>
          )}
          {year && (
            <Link
              href={href({ year: undefined, page: undefined })}
              className="inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand/[0.06] py-1 pl-3 pr-2 text-brand hover:border-brand"
            >
              {year}
              <span aria-label={ui.clear} className="text-base leading-none">×</span>
            </Link>
          )}
          {filtered && (
            <Link href={`/${lang}/orders`} className="-my-2 ml-auto py-2 font-medium text-brand hover:underline">
              {ui.clear}
            </Link>
          )}
        </div>

        {data.rows.length === 0 ? (
          <div className="orders-list mt-4 rounded-lg border border-dashed border-line bg-white p-12 text-center">
            <p className="font-display text-xl font-bold">{ui.noResults}</p>
            <p className="mt-2 text-muted">{ui.noResultsHint}</p>
          </div>
        ) : (
          <ul className="orders-list mt-4 divide-y divide-line overflow-hidden rounded-lg border border-line bg-white">
            {data.rows.map((p) => {
              const d = new Date(p.publishedAt + "T00:00:00");
              const loc = intlLocale(lang);
              return (
                <li key={p.id}>
                  <Link href={`/${lang}/orders/${p.id}`} className="group flex items-start gap-4 px-4 py-4 transition-colors hover:bg-paper/60 sm:items-center sm:gap-5 sm:px-5">
                    <time dateTime={p.publishedAt} className="w-14 shrink-0 overflow-hidden rounded border border-line bg-white text-center leading-none">
                      <span className="block bg-brand py-1 text-[0.68rem] font-semibold uppercase tracking-wide text-white">
                        {new Intl.DateTimeFormat(loc, { month: "short" }).format(d)}
                      </span>
                      <span className="block pt-1.5 text-[1.35rem] font-bold text-ink">{d.getDate()}</span>
                      <span className="block pb-1.5 pt-0.5 text-[0.68rem] text-muted">{d.getFullYear()}</span>
                    </time>
                    <div className="min-w-0 flex-1">
                      <h3 className="line-clamp-2 text-[1.02rem] font-medium leading-snug text-ink group-hover:text-brand">{pick(lang, p.titleEn, p.titleHi, p.i18n?.title)}</h3>
                      {p.files > 0 && (
                        <p className="mt-1.5 inline-flex items-center gap-1 text-[0.8rem] text-muted">
                          <Icon name="pdf" size={13} /> {ui.pdf}
                        </p>
                      )}
                    </div>
                    <Icon name="arrow" size={18} className="hidden shrink-0 text-muted transition group-hover:translate-x-1 group-hover:text-brand sm:block" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        {totalPages > 1 && (
          <nav aria-label={ui.pagination} className="mt-8 flex items-center justify-between gap-3">
            {page > 1 ? (
              <Link href={href({ page: page - 1 })} className="rounded-full border-2 border-brand px-5 py-2 font-bold text-brand hover:bg-brand hover:text-white">← {ui.previous}</Link>
            ) : <span />}
            <span className="text-sm text-muted">{ui.page} {page} {ui.of} {totalPages}</span>
            {page < totalPages ? (
              <Link href={href({ page: page + 1 })} className="rounded-full border-2 border-brand px-5 py-2 font-bold text-brand hover:bg-brand hover:text-white">{ui.next} →</Link>
            ) : <span />}
          </nav>
        )}
      </section>
    </div>
  );
}
