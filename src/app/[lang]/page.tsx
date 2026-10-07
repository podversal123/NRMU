import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import Icon from "@/components/Icon";
import { getDict, isLang } from "@/lib/i18n";
import { archiveSince, categoryLabel, formatDate, posts } from "@/lib/data";
import { divisions, leaders, quickLinks } from "@/lib/site";

const popular = ["DA", "MACP", "NPS", "7th CPC", "HRMS", "LDCE"];

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const t = getDict(lang);
  const latest = posts.slice(0, 12);
  const board = posts.slice(0, 6);
  const ticker = posts.slice(0, 10);

  return (
    <>
      {/* HERO */}
      <section className="grain relative isolate overflow-hidden bg-coal text-white">
        <div className="pointer-events-none absolute -right-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-brand/25 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pb-24 pt-14 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:pb-28 lg:pt-20">
          <div>
            <p className="rise inline-flex items-center gap-2 rounded-full border border-signal/40 bg-signal/10 px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-signal">
              <span className="h-2 w-2 animate-pulse rounded-full bg-signal" />
              {t.heroKicker}
            </p>
            <h1 className="rise rise-2 mt-6 font-display text-[2.6rem] font-extrabold leading-[1.05] tracking-tight sm:text-6xl lg:text-[4.4rem]">
              {t.heroTitleA}
              <br />
              <span className="text-signal">{t.heroTitleB}</span>
            </h1>
            <p className="rise rise-3 mt-6 max-w-xl text-lg leading-relaxed text-white/75">{t.heroSub}</p>

            <form
              action={`/${lang}/orders`}
              role="search"
              className="rise rise-3 mt-9 flex max-w-2xl overflow-hidden rounded-xl bg-white p-1.5 shadow-[0_10px_0_rgba(0,0,0,.35)]"
            >
              <label htmlFor="hero-q" className="sr-only">
                {t.search}
              </label>
              <input
                id="hero-q"
                name="q"
                type="search"
                placeholder={t.searchPlaceholder}
                className="min-w-0 flex-1 bg-transparent px-4 text-base text-ink placeholder:text-ink/45 focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-lg bg-brand px-6 py-3.5 text-base font-bold text-white transition hover:bg-brand-deep"
              >
                {t.search}
              </button>
            </form>

            <div className="rise rise-3 mt-5 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-white/50">{t.popular}</span>
              {popular.map((p) => (
                <Link
                  key={p}
                  href={`/${lang}/orders?q=${encodeURIComponent(p)}`}
                  className="rounded-full border border-white/20 px-3.5 py-1.5 text-sm font-semibold text-white/85 transition hover:border-signal hover:bg-signal hover:text-ink"
                >
                  {p}
                </Link>
              ))}
            </div>
          </div>

          {/* Departure board */}
          <div className="rise rise-3 relative">
            <div className="absolute -top-11 right-6 z-10 hidden h-[5.5rem] w-[5.5rem] sm:block">
              <Image src="/logo.jpg" alt="" width={88} height={88} className="rounded-full ring-4 ring-coal" />
            </div>
            <div className="overflow-hidden rounded-2xl border border-white/15 bg-ink shadow-2xl">
              <div className="flex items-center justify-between bg-signal px-5 py-3 text-ink">
                <div>
                  <p className="font-display text-lg font-extrabold uppercase tracking-wide">{t.board}</p>
                  <p className="text-xs font-semibold opacity-70">{t.boardSub}</p>
                </div>
                <span className="font-mono text-xs font-bold">● LIVE</span>
              </div>
              <ul className="divide-y divide-white/10">
                {board.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/${lang}/orders/${p.id}`}
                      className="group grid grid-cols-[auto_1fr] gap-x-4 px-5 py-3.5 transition hover:bg-white/5"
                    >
                      <span className="pt-0.5 font-mono text-xs font-bold text-signal">
                        {formatDate(p.date, lang).toUpperCase()}
                      </span>
                      <span className="line-clamp-2 text-[0.95rem] font-semibold leading-snug text-white group-hover:text-signal">
                        {p.title}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link
                href={`/${lang}/orders`}
                className="flex items-center justify-between bg-white/5 px-5 py-3 text-sm font-bold text-signal hover:bg-white/10"
              >
                {t.viewAll}
                <Icon name="arrow" size={18} />
              </Link>
            </div>
          </div>
        </div>
        <div className="track absolute inset-x-0 bottom-0" />
      </section>

      {/* TICKER */}
      <div className="marquee overflow-hidden border-y-2 border-ink bg-signal text-ink" aria-label={t.board}>
        <div className="marquee-track flex py-3">
          {[...ticker, ...ticker].map((p, i) => (
            <Link
              key={`${p.id}-${i}`}
              href={`/${lang}/orders/${p.id}`}
              className="flex shrink-0 items-center gap-3 px-6 text-sm font-bold hover:underline"
              tabIndex={i >= ticker.length ? -1 : 0}
            >
              <span className="h-2 w-2 rotate-45 bg-brand" />
              <span className="max-w-[34rem] truncate">{p.title}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* STATS */}
      <section className="mx-auto -mt-0 max-w-7xl px-4 pt-12 sm:px-6">
        <dl className="grid grid-cols-1 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {[
            { v: String(divisions.length), l: t.statsDivisions },
            { v: posts.length.toLocaleString(lang === "hi" ? "hi-IN" : "en-IN"), l: t.statsArchive },
            { v: archiveSince, l: t.statsSince },
          ].map((s) => (
            <div key={s.l} className="px-8 py-7 text-center sm:text-left">
              <dt className="order-2 text-sm font-semibold uppercase tracking-wider text-muted">{s.l}</dt>
              <dd className="font-display text-5xl font-extrabold tracking-tight text-brand">{s.v}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* QUICK LINKS */}
      <section className="mx-auto max-w-7xl px-4 pt-20 sm:px-6">
        <SectionHead title={t.services} sub={t.servicesSub} />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map((q) => (
            <Link
              key={q.key}
              href={`/${lang}/orders?cat=${q.cat}`}
              className="group relative flex items-center gap-5 overflow-hidden rounded-2xl border border-line bg-white p-6 transition hover:-translate-y-1 hover:border-ink hover:shadow-[0_8px_0_var(--ink)]"
            >
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-ink text-signal transition group-hover:bg-brand group-hover:text-white">
                <Icon name={q.icon} size={26} />
              </span>
              <span className="font-display text-lg font-bold leading-snug">{lang === "hi" ? q.hi : q.en}</span>
              <Icon name="arrow" className="ml-auto shrink-0 text-ink/30 transition group-hover:translate-x-1 group-hover:text-brand" />
            </Link>
          ))}
        </div>
      </section>

      {/* LATEST */}
      <section className="mx-auto max-w-7xl px-4 pt-24 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHead title={t.latestHeading} sub={t.latestSub} />
          <Link href={`/${lang}/orders`} className="rounded-full border-2 border-ink px-5 py-2 text-sm font-bold hover:bg-ink hover:text-white">
            {t.viewAll} →
          </Link>
        </div>
        <ul className="mt-8 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
          {latest.map((p) => {
            const label = categoryLabel(p) ?? t.update;
            return (
              <li key={p.id}>
                <Link
                  href={`/${lang}/orders/${p.id}`}
                  className="group grid gap-2 px-5 py-5 transition hover:bg-paper sm:grid-cols-[8.5rem_1fr_auto] sm:items-center sm:gap-6 sm:px-7"
                >
                  <div className="flex items-center gap-3 sm:block">
                    <p className="font-mono text-xs font-bold text-muted">{formatDate(p.date, lang)}</p>
                    <span className="mt-1.5 inline-block max-w-full truncate rounded bg-ink px-2 py-0.5 text-[0.68rem] font-bold uppercase tracking-wider text-signal">
                      {label}
                    </span>
                  </div>
                  <h3 className="line-clamp-2 font-display text-[1.02rem] font-semibold leading-snug group-hover:text-brand">
                    {p.title}
                  </h3>
                  <div className="flex items-center gap-3 text-sm font-bold text-brand">
                    {p.pdfs > 0 && (
                      <span className="inline-flex items-center gap-1 rounded border border-brand/40 px-2 py-0.5 text-xs">
                        <Icon name="pdf" size={14} /> {t.pdf}
                      </span>
                    )}
                    <Icon name="arrow" size={20} className="transition group-hover:translate-x-1" />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {/* DIVISIONS */}
      <section className="mt-24 bg-coal py-20 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHead title={t.divisionsHeading} sub={t.divisionsSub} dark />
          <div className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-white/15 sm:grid-cols-3">
            {divisions.map((d, i) => (
              <Link
                key={d.slug}
                href={`/${lang}/divisions/${d.slug}`}
                className="group relative bg-coal p-6 transition hover:bg-brand sm:p-8"
              >
                <span className="font-mono text-xs font-bold text-signal group-hover:text-white">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="mt-6 font-display text-2xl font-extrabold leading-tight sm:text-3xl">
                  {lang === "hi" ? d.hi : d.en}
                </p>
                <p className="mt-1 text-sm text-white/60 group-hover:text-white/85">
                  {lang === "hi" ? d.en : d.hi}
                </p>
                <Icon name="arrow" className="absolute bottom-6 right-6 text-white/30 transition group-hover:translate-x-1 group-hover:text-white" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* LEADERSHIP */}
      <section className="mx-auto max-w-7xl px-4 pt-24 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHead title={t.leadersHeading} sub={t.leadersSub} />
          <Link href={`/${lang}/officials`} className="rounded-full border-2 border-ink px-5 py-2 text-sm font-bold hover:bg-ink hover:text-white">
            {t.allOfficials} →
          </Link>
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {leaders.map((l) => {
            const name = lang === "hi" ? l.nameHi : l.name;
            const initials = l.name.replace("Sh. ", "").split(/[ .]+/).filter(Boolean).map((w) => w[0]).join("").slice(0, 2);
            return (
              <article key={l.name} className="flex items-center gap-6 rounded-2xl border border-line bg-white p-6">
                <div className="grid h-24 w-24 shrink-0 place-items-center rounded-full bg-ink font-display text-3xl font-extrabold text-signal ring-4 ring-brand/90">
                  {initials}
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">{t[l.role]}</p>
                  <h3 className="mt-1 font-display text-2xl font-extrabold">{name}</h3>
                  <p className="text-sm text-muted">{t.orgShort}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto mt-24 max-w-7xl px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-brand px-8 py-14 text-white sm:px-14">
          <div className="absolute inset-x-0 bottom-0 opacity-60"><div className="track" /></div>
          <div className="relative flex flex-wrap items-center justify-between gap-8">
            <div className="max-w-2xl">
              <h2 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">{t.ctaTitle}</h2>
              <p className="mt-3 text-lg text-white/90">{t.ctaText}</p>
            </div>
            <Link
              href={`/${lang}/join`}
              className="rounded-full bg-ink px-8 py-4 text-lg font-bold text-white shadow-[0_5px_0_rgba(0,0,0,.35)] transition hover:translate-y-0.5 hover:bg-coal2"
            >
              {t.join} →
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

function SectionHead({ title, sub, dark = false }: { title: string; sub: string; dark?: boolean }) {
  return (
    <div>
      <div className={dark ? "track mb-5 w-24" : "track-red mb-5 w-24"} />
      <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h2>
      <p className={`mt-2 max-w-2xl ${dark ? "text-white/65" : "text-muted"}`}>{sub}</p>
    </div>
  );
}
