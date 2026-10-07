import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import Icon from "@/components/Icon";
import { isLang, type Lang } from "@/lib/i18n";
import { getEvents, getGalleryPhotos } from "@/lib/content";
import {
  getArchiveStats,
  getDivisions,
  getFeaturedLeaders,
  getLatestPosts,
  getQuickLinks,
  getSearchChips,
  getSettings,
  pick,
  setting,
  getUi,
} from "@/lib/queries";

const wrap = "mx-auto max-w-[1180px] px-5 sm:px-8";
const h2 = "text-[clamp(1.8rem,3vw,2.5rem)] font-semibold leading-tight";

function dateParts(iso: string, lang: Lang) {
  const d = new Date(iso + "T00:00:00");
  const loc = lang === "hi" ? "hi-IN" : "en-IN";
  return { day: d.getDate(), month: new Intl.DateTimeFormat(loc, { month: "short" }).format(d), year: d.getFullYear() };
}

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const ui = await getUi(lang);

  const [s, latest, divisions, leaders, quick, chips, stats, photos, events] = await Promise.all([
    getSettings(),
    getLatestPosts(8),
    getDivisions(),
    getFeaturedLeaders(),
    getQuickLinks(),
    getSearchChips(),
    getArchiveStats(),
    getGalleryPhotos(7, true),
    getEvents(0, 3),
  ]);
  const t = (key: string) => setting(s, key, lang);
  const num = (n: number | string) => Number(n).toLocaleString(lang === "hi" ? "hi-IN" : "en-IN");
  const heroImage = t("hero.image");
  const ctaImage = t("cta.image");

  return (
    <>
      {/* BANNER: full-screen photograph, nothing on top of it */}
      <section className="relative h-[100svh] max-h-[62rem] min-h-[30rem] w-full overflow-hidden bg-ink">
        {heroImage && (
          <Image src={heroImage} alt={t("hero.image_alt")} fill priority sizes="100vw" quality={90} className="object-cover object-[30%_60%] lg:object-[40%_62%]" />
        )}
      </section>
      <div className="track" aria-hidden="true" />

      {/* STATS */}
      <section className="bg-ink pb-12 pt-2 text-light">
        <dl className={`${wrap} grid grid-cols-2 gap-y-7 lg:grid-cols-4`}>
          {[
            { v: num(divisions.length), l: t("stats.divisions") },
            { v: num(stats.branches), l: t("stats.branches") },
            { v: num(stats.total), l: t("stats.archive") },
            { v: stats.since, l: t("stats.since") },
          ].map((x, i) => (
            <div key={x.l} className={`${i % 2 === 1 ? "border-l border-[#34363c] pl-6" : ""} ${i === 0 ? "lg:pl-0" : "lg:border-l lg:border-[#34363c] lg:pl-7"}`}>
              <dd className="font-display text-[clamp(2.2rem,3.6vw,3rem)] font-semibold leading-none text-soft">{x.v}</dd>
              <dt className="mt-2 text-[0.95rem] tracking-[0.02em] text-dim">{x.l}</dt>
            </div>
          ))}
        </dl>
      </section>

      {/* INTRO + SEARCH */}
      <section className="py-16 lg:py-20">
        <div className={`${wrap} grid items-end gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16`}>
          <div>
            <p className="text-base font-medium text-brand">{t("hero.kicker")}</p>
            <h1 className="mt-4 text-[clamp(2.1rem,4vw,3.4rem)] font-semibold leading-[1.05]">
              {t("hero.title_a")} {t("hero.title_b")}
            </h1>
            <div className="rule mt-6" />
          </div>
          <div>
            <p className="text-lg text-muted">{t("hero.sub")}</p>
            <form action={`/${lang}/orders`} role="search" className="mt-6 flex border-b border-ink">
              <label htmlFor="hero-q" className="sr-only">
                {ui.search}
              </label>
              <input
                id="hero-q"
                name="q"
                type="search"
                placeholder={t("hero.search_placeholder")}
                className="min-w-0 flex-1 bg-transparent py-3 text-lg placeholder:text-muted/80 focus:outline-none"
              />
              <button type="submit" className="px-1 py-3 text-[0.95rem] font-semibold tracking-[0.02em] text-brand hover:text-ink">
                {ui.search} →
              </button>
            </form>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted">{ui.popular}:</span>
              {chips.map((c) => (
                <Link key={c.id} href={`/${lang}/orders?q=${encodeURIComponent(c.term)}`} className="rounded-full border border-line px-3.5 py-1 text-sm hover:border-ink">
                  {c.term}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SHORTCUTS */}
      <section className="bg-white py-14 lg:py-16">
        <div className={wrap}>
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <h2 className={h2}>{t("home.services_title")}</h2>
            <p className="max-w-[34ch] text-muted">{t("home.services_sub")}</p>
          </div>
          <div className="grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
            {quick.map((q) => (
              <Link key={q.id} href={`/${lang}${q.href}`} className="group flex items-center gap-4 bg-white px-6 py-5 transition hover:bg-paper">
                <Icon name={q.icon} size={26} className="shrink-0 text-brand" />
                <span className="text-[1.08rem] font-medium leading-snug">{pick(lang, q.labelEn, q.labelHi)}</span>
                <span className="ml-auto text-lg text-muted transition group-hover:translate-x-1 group-hover:text-brand">→</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* NOTICES */}
      <section className="py-16 lg:py-20">
        <div className={`${wrap} grid gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:gap-16`}>
          <div>
            <h2 className={h2}>{t("home.latest_title")}</h2>
            <p className="mt-4 max-w-[30ch] text-muted">{t("home.latest_sub")}</p>
            <Link href={`/${lang}/orders`} className="mt-6 inline-block border-b border-signal pb-0.5 font-medium tracking-[0.02em] hover:text-brand">
              {ui.viewAll} →
            </Link>
          </div>
          <ul className="border-t border-ink">
            {latest.map((p) => {
              const d = dateParts(p.publishedAt, lang);
              return (
                <li key={p.id} className="grid grid-cols-[4rem_1fr] items-baseline gap-x-5 gap-y-1.5 border-b border-line py-4 sm:grid-cols-[4.5rem_1fr_auto]">
                  <time dateTime={p.publishedAt} className="font-display text-[1.45rem] font-bold leading-none text-brand">
                    {d.day} {d.month}
                    <span className="mt-1 block font-sans text-xs font-normal tracking-[0.04em] text-muted">{d.year}</span>
                  </time>
                  <Link href={`/${lang}/orders/${p.id}`} className="text-[1.05rem] font-medium leading-snug hover:text-brand">
                    {pick(lang, p.titleEn, p.titleHi)}
                  </Link>
                  <Link href={`/${lang}/orders/${p.id}`} className="col-start-2 w-fit border-b border-signal pb-0.5 text-sm font-medium tracking-[0.02em] hover:text-brand sm:col-start-3">
                    {p.files > 0 ? ui.download : ui.read}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* UPCOMING EVENTS (only when there are some) */}
      {events.upcoming.length > 0 && (
        <section className="py-14 lg:py-16">
          <div className={wrap}>
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className={h2}>{t("home.events_title")}</h2>
                <p className="mt-2 text-muted">{t("home.events_sub")}</p>
              </div>
              <Link href={`/${lang}/events`} className="border-b border-signal pb-0.5 font-medium tracking-[0.02em] hover:text-brand">
                {ui.viewAll} →
              </Link>
            </div>
            <div className="grid gap-x-10 gap-y-8 md:grid-cols-3">
              {events.upcoming.map((e) => (
                <article key={e.id} className="border-t border-ink pt-5">
                  <p className="font-display text-xl font-bold text-brand">
                    {new Intl.DateTimeFormat(lang === "hi" ? "hi-IN" : "en-IN", { dateStyle: "long", timeZone: "Asia/Kolkata" }).format(new Date(e.startsAt))}
                  </p>
                  <h3 className="mt-1 text-[1.5rem] leading-tight">{pick(lang, e.titleEn, e.titleHi)}</h3>
                  <p className="mt-2 text-muted">{pick(lang, e.venueEn, e.venueHi)}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* PHOTOS FROM THE FIELD (only when photos have been uploaded from the admin panel) */}
      {photos.length > 0 && (
        <section className="bg-white py-14 lg:py-16">
          <div className={wrap}>
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className={h2}>{t("home.photos_title")}</h2>
                <p className="mt-2 text-muted">{t("home.photos_sub")}</p>
              </div>
              <Link href={`/${lang}/gallery`} className="border-b border-signal pb-0.5 font-medium tracking-[0.02em] hover:text-brand">
                {ui.viewAll} →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {photos.map((p, i) => (
                <figure key={p.id} className={`group relative overflow-hidden bg-ink ${i === 0 ? "col-span-2 row-span-2" : ""}`}>
                  <div className={i === 0 ? "aspect-square" : "aspect-[4/3]"}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt={pick(lang, p.captionEn, p.captionHi)} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
                  </div>
                  {p.captionEn && (
                    <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/85 to-transparent px-4 pb-3 pt-10 text-sm text-light">
                      {pick(lang, p.captionEn, p.captionHi)}
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* DIVISIONS */}
      <section className="bg-ink py-16 text-light lg:py-20">
        <div className={wrap}>
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <h2 className={h2}>{t("home.divisions_title")}</h2>
            <p className="max-w-[36ch] text-dim">{t("home.divisions_sub")}</p>
          </div>
          <div className="grid border-t border-[#34363c] sm:grid-cols-2 lg:grid-cols-3">
            {divisions.map((d) => (
              <Link
                key={d.slug}
                href={`/${lang}/divisions/${d.slug}`}
                className="group border-b border-[#34363c] py-7 pr-6 transition hover:bg-white/[0.03] sm:border-r sm:pl-8 sm:[&:nth-child(2n)]:border-r-0 sm:[&:nth-child(2n+1)]:pl-0 lg:[&:nth-child(2n)]:border-r lg:[&:nth-child(2n+1)]:pl-8 lg:[&:nth-child(3n)]:border-r-0 lg:[&:nth-child(3n+1)]:pl-0"
              >
                <h3 className="text-[1.9rem] leading-none group-hover:text-soft">{pick(lang, d.nameEn, d.nameHi)}</h3>
                {d.nameHi && <p className="mt-1.5 text-dim">{lang === "hi" ? d.nameEn : d.nameHi}</p>}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* LEADERSHIP */}
      <section className="bg-white py-14 lg:py-16">
        <div className={wrap}>
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <h2 className={h2}>{t("home.leaders_title")}</h2>
            <Link href={`/${lang}/officials`} className="border-b border-signal pb-0.5 font-medium tracking-[0.02em] hover:text-brand">
              {ui.viewAll} →
            </Link>
          </div>
          <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
            {leaders.map((l) => (
              <article key={l.id} className="flex gap-5 border-t border-ink pt-5">
                {l.photoUrl && <Image src={l.photoUrl} alt="" width={96} height={96} className="h-24 w-24 shrink-0 object-cover" />}
                <div>
                  <p className="text-base font-medium text-brand">{pick(lang, l.designationEn, l.designationHi)}</p>
                  <h3 className="mt-1.5 text-[1.8rem] leading-[1.1]">{pick(lang, l.nameEn, l.nameHi)}</h3>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* JOIN */}
      <section className="relative isolate overflow-hidden bg-ink py-20 text-light lg:py-24">
        {ctaImage && <Image src={ctaImage} alt="" fill sizes="100vw" className="-z-10 object-cover" />}
        <div className="absolute inset-0 -z-10 bg-ink/70" />
        <div className={`${wrap} grid items-end gap-10 lg:grid-cols-[1.2fr_0.8fr]`}>
          <div>
            <h2 className={h2}>{t("home.cta_title")}</h2>
            <p className="mt-4 max-w-[44ch] text-lg text-light/80">{t("home.cta_text")}</p>
          </div>
          <div className="flex flex-wrap gap-3.5 lg:justify-end">
            <Link href={`/${lang}/join`} className="btn-gold">
              {t("cta.join")}
            </Link>
            <Link href={`/${lang}/orders`} className="btn-ghost">
              {ui.searchOrders}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
