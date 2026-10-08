import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import Icon from "@/components/Icon";
import PageHero from "@/components/PageHero";
import { isLang, type Lang } from "@/lib/i18n";
import { getCategoryTree, getYears, listPostsCached, PAGE_SIZE, queryPosts, type CategoryNode } from "@/lib/content";
import { formatDate, getSettings, pick, setting, getUi } from "@/lib/queries";
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
      <Suspense fallback={<div className="mx-auto max-w-[1180px] px-5 py-20 sm:px-8" aria-busy="true" />}>
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

  const byId = new Map(tree.map((c) => [c.id, c]));
  const activeCat = cat ? tree.find((c) => c.slug === cat) : undefined;
  const rootOf = (c?: CategoryNode) => {
    let cur = c;
    while (cur?.parentId) cur = byId.get(cur.parentId);
    return cur;
  };
  const activeRoot = rootOf(activeCat);
  const roots = tree
    .filter((c) => !c.parentId && !c.hidden)
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total);
  const children = activeRoot
    ? tree.filter((c) => c.parentId === activeRoot.id && c.total > 0)
    : [];

  const href = (over: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    const merged = { q: q || undefined, cat, year, ...over };
    for (const [k, v] of Object.entries(merged)) if (v !== undefined && v !== "") p.set(k, String(v));
    const qs = p.toString();
    return `/${lang}/orders${qs ? `?${qs}` : ""}`;
  };

  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
  const filtered = Boolean(q || cat || year);

  const filterCount = [cat, year].filter(Boolean).length;
  const filterBody = (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl text-ink">{ui.category}</h2>
        <ul className="mt-3 space-y-1 text-[0.95rem]">
          <li>
            <Link href={href({ cat: undefined, page: undefined })} className={`block rounded px-2 py-2.5 hover:bg-paper lg:py-1.5 ${!cat ? "font-bold text-brand" : ""}`}>
              {ui.allCategories}
            </Link>
          </li>
          {roots.map((c) => (
            <li key={c.id}>
              <Link
                href={href({ cat: c.slug, page: undefined })}
                className={`flex items-center justify-between gap-2 rounded px-2 py-2.5 hover:bg-paper lg:py-1.5 ${activeRoot?.id === c.id ? "font-bold text-brand" : ""}`}
              >
                <span className="truncate">{pick(lang, c.nameEn, c.nameHi)}</span>
                <span className="font-mono text-xs text-muted">{c.total}</span>
              </Link>
              {activeRoot?.id === c.id && children.length > 0 && (
                <ul className="ml-3 mt-1 space-y-0.5 border-l-2 border-line pl-3">
                  {children.map((k) => (
                    <li key={k.id}>
                      <Link
                        href={href({ cat: k.slug, page: undefined })}
                        className={`flex items-center justify-between gap-2 rounded px-2 py-2 text-sm hover:bg-paper lg:py-1 ${cat === k.slug ? "font-bold text-brand" : ""}`}
                      >
                        <span className="truncate">{pick(lang, k.nameEn, k.nameHi)}</span>
                        <span className="font-mono text-xs text-muted">{k.total}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h2 className="font-display text-xl text-ink">{ui.year}</h2>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Link href={href({ year: undefined, page: undefined })} className={`rounded-full border px-3.5 py-2 text-sm lg:px-3 lg:py-1 ${!year ? "border-ink bg-ink text-light" : "border-line hover:border-ink"}`}>
            {ui.allYears}
          </Link>
          {years.map((y) => (
            <Link
              key={y.y}
              href={href({ year: y.y, page: undefined })}
              className={`rounded-full border px-3.5 py-2 text-sm lg:px-3 lg:py-1 ${year === y.y ? "border-ink bg-ink text-light" : "border-line hover:border-ink"}`}
            >
              {y.y}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="mx-auto grid max-w-[1180px] grid-cols-[minmax(0,1fr)] gap-6 px-5 py-8 sm:px-8 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-8 lg:py-10">
      <aside className="min-w-0">
        {/* phones: the filters are folded away so the orders come first; desktop: always open */}
        <details className="border border-line bg-white lg:hidden">
          <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-5 py-3 font-display text-lg font-bold">
            {ui.filters}
            {filterCount > 0 && <span className="grid h-6 min-w-6 place-items-center rounded-full bg-brand px-1.5 text-xs font-bold text-white">{filterCount}</span>}
            <span aria-hidden className="ml-auto text-muted">▾</span>
          </summary>
          <div className="border-t border-line px-5 py-5">{filterBody}</div>
        </details>
        <div className="hidden border border-line bg-white lg:block">
          <p className="px-5 py-4 font-display text-lg font-bold">{ui.filters}</p>
          <div className="border-t border-line px-5 py-5">{filterBody}</div>
        </div>
      </aside>

      <section className="min-w-0">
        <form action={`/${lang}/orders`} role="search" className="flex overflow-hidden rounded-none border-2 border-ink bg-white">
          {cat && <input type="hidden" name="cat" value={cat} />}
          {year && <input type="hidden" name="year" value={year} />}
          <label htmlFor="orders-q" className="sr-only">{ui.searchOrders}</label>
          <input id="orders-q" name="q" type="search" defaultValue={q} placeholder={ui.searchOrders} className="min-w-0 flex-1 bg-transparent px-4 py-3.5 text-base focus:outline-none" />
          <button type="submit" className="bg-brand px-5 font-medium text-white hover:bg-brand-deep sm:px-6">{ui.search}</button>
        </form>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
          <p>
            <strong className="text-ink">{data.total.toLocaleString(lang === "hi" ? "hi-IN" : "en-IN")}</strong>{" "}
            {data.total === 1 ? ui.result : ui.results}
            {q && <> · “{q}”</>}
          </p>
          {filtered && (
            <Link href={`/${lang}/orders`} className="-my-2.5 inline-block py-2.5 font-semibold text-brand underline-offset-2 hover:underline">
              {ui.clear}
            </Link>
          )}
        </div>

        {data.rows.length === 0 ? (
          <div className="mt-6 rounded-none border border-dashed border-line bg-white p-12 text-center">
            <p className="font-display text-xl font-bold">{ui.noResults}</p>
            <p className="mt-2 text-muted">{ui.noResultsHint}</p>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-line overflow-hidden rounded-none border border-line bg-white">
            {data.rows.map((p) => (
              <li key={p.id}>
                <Link href={`/${lang}/orders/${p.id}`} className="group grid gap-2 px-5 py-5 transition hover:bg-paper sm:grid-cols-[8rem_1fr_auto] sm:items-center sm:gap-5">
                  <div className="flex items-center gap-3 sm:block">
                    <p className="font-mono text-xs font-bold text-muted">{formatDate(p.publishedAt, lang)}</p>
                    {p.labelEn && (
                      <span className="mt-1 inline-block max-w-full truncate text-sm text-brand">
                        {p.labelEn}
                      </span>
                    )}
                  </div>
                  <h3 className="line-clamp-3 font-sans text-[1.05rem] font-medium leading-snug group-hover:text-brand">
                    {pick(lang, p.titleEn, p.titleHi)}
                  </h3>
                  <div className="flex items-center gap-3 text-sm font-bold text-brand">
                    {p.files > 0 && (
                      <span className="inline-flex items-center gap-1 rounded border border-brand/40 px-2 py-0.5 text-xs">
                        <Icon name="pdf" size={14} /> {ui.pdf}
                      </span>
                    )}
                    <Icon name="arrow" size={20} className="transition group-hover:translate-x-1" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {totalPages > 1 && (
          <nav aria-label={ui.pagination} className="mt-8 flex items-center justify-between gap-3">
            {page > 1 ? (
              <Link href={href({ page: page - 1 })} className="rounded-full border-2 border-ink px-5 py-2 font-bold hover:bg-ink hover:text-white">← {ui.previous}</Link>
            ) : <span />}
            <span className="text-sm text-muted">{ui.page} {page} {ui.of} {totalPages}</span>
            {page < totalPages ? (
              <Link href={href({ page: page + 1 })} className="rounded-full border-2 border-ink px-5 py-2 font-bold hover:bg-ink hover:text-white">{ui.next} →</Link>
            ) : <span />}
          </nav>
        )}
      </section>
    </div>
  );
}
