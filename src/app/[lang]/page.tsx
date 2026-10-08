import Image from "next/image";
import Link from "next/link";
import Photo from "@/components/Photo";
import { notFound } from "next/navigation";
import DivisionCard from "@/components/DivisionCard";
import Icon from "@/components/Icon";
import { isLang, type Lang } from "@/lib/i18n";
import { getDivisionCards, getEvents, getGalleryPhotos, getPostsByCategory } from "@/lib/content";
import { getFeaturedLeaders, getLatestPosts, getSearchChips, getSettings, getUi, pick, setting } from "@/lib/queries";

const wrap = "mx-auto max-w-[1180px] px-5 sm:px-8";
const h2 = "text-[clamp(1.5rem,2.2vw,1.75rem)] font-medium";

function dateParts(iso: string, lang: Lang) {
  const d = new Date(iso + "T00:00:00");
  const loc = lang === "hi" ? "hi-IN" : "en-IN";
  return { day: d.getDate(), month: new Intl.DateTimeFormat(loc, { month: "short" }).format(d), year: d.getFullYear() };
}

/** A bordered panel with a title bar. */
function Panel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="border border-line bg-white">
      <header className="flex items-center justify-between gap-3 border-b-2 border-signal px-5 py-3">
        <h2 className="text-xl font-semibold leading-none">{title}</h2>
        {action}
      </header>
      {children}
    </section>
  );
}

/**
 * Home page. Every block appears exactly once: the notice board lists the newest orders, the right column
 * holds leaders and highlights, divisions get their own section, and photos/events show up only when the
 * admin panel has some.
 */
export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();

  const [s, ui, latest, leaders, chips, photos, events, divisions] = await Promise.all([
    getSettings(),
    getUi(lang),
    getLatestPosts(8),
    getFeaturedLeaders(),
    getSearchChips(),
    getGalleryPhotos(7, true),
    getEvents(0, 3),
    getDivisionCards(),
  ]);
  const t = (key: string) => setting(s, key, lang);
  const news = await getPostsByCategory(setting(s, "config.news.category", "en"), 4, false, latest.map((p) => p.id));
  const heroImage = t("hero.image");
  const evDate = (iso: string) => new Intl.DateTimeFormat(lang === "hi" ? "hi-IN" : "en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" }).format(new Date(iso));
  const more = (href: string) => (
    <Link href={`/${lang}${href}`} className="shrink-0 text-sm font-medium text-brand hover:underline">
      {ui.viewAll} →
    </Link>
  );
  const labels = { secretary: t("division.secretary_label"), branches: ui.branches, branchSecretaries: ui.branchSecretaries };

  return (
    <>
      {/* BANNER with the search card */}
      <section className="relative bg-paper">
        <div className="relative h-56 w-full overflow-hidden bg-ink sm:h-[24rem] lg:h-[31rem]">
          {heroImage && <Image src={heroImage} alt={t("hero.image_alt")} fill priority sizes="100vw" quality={85} className="object-cover object-[35%_60%]" />}
          <div className="absolute inset-0 hidden bg-gradient-to-r from-ink/75 via-ink/25 to-transparent lg:block" />
        </div>
        <div className="pointer-events-none relative z-10 -mt-10 lg:absolute lg:inset-0 lg:mt-0 lg:flex lg:items-center">
          <div className={`${wrap} w-full`}>
            <div className="pointer-events-auto border border-line bg-white p-6 sm:p-8 lg:max-w-[33rem]">
              <h1 className="text-[clamp(1.6rem,2.4vw,2rem)] font-medium leading-tight">
                {t("hero.title_a")} <span className="text-brand">{t("hero.title_b")}</span>
              </h1>
              <p className="mt-3 text-[0.97rem] text-muted">{t("hero.sub")}</p>
              <form action={`/${lang}/orders`} role="search" className="mt-5">
                <label htmlFor="hero-q" className="mb-1.5 block text-sm font-medium">
                  {t("hero.search_title")}
                </label>
                <div className="flex">
                  <input
                    id="hero-q"
                    name="q"
                    type="search"
                    placeholder={t("hero.search_placeholder")}
                    className="min-w-0 flex-1 border border-ink bg-white px-4 py-3 text-base placeholder:text-muted/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-signal"
                  />
                  <button type="submit" className="bg-brand px-5 font-medium text-white hover:bg-brand-deep">
                    {ui.search}
                  </button>
                </div>
              </form>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted">{ui.popular}:</span>
                {chips.map((c) => (
                  <Link key={c.id} href={`/${lang}/orders?q=${encodeURIComponent(c.term)}`} className="border border-line px-3 py-1 text-sm hover:border-ink">
                    {c.term}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* NOTICE BOARD | LEADERS + HIGHLIGHTS */}
      <section className="py-12 lg:py-14">
        <div className={`${wrap} grid items-start gap-6 lg:grid-cols-[1.3fr_1fr]`}>
          <Panel title={t("home.notice_title")} action={more("/orders")}>
            <ul className="divide-y divide-line">
              {latest.map((p) => {
                const d = dateParts(p.publishedAt, lang);
                return (
                  <li key={p.id}>
                    <Link href={`/${lang}/orders/${p.id}`} className="group flex gap-4 px-5 py-3.5 hover:bg-paper">
                      <time dateTime={p.publishedAt} className="w-12 shrink-0 text-center leading-none">
                        <span className="block text-[1.5rem] font-bold text-brand">{d.day}</span>
                        <span className="mt-0.5 block text-xs text-muted">
                          {d.month} {d.year}
                        </span>
                      </time>
                      <span className="min-w-0">
                        <span className="line-clamp-2 text-[0.98rem] font-medium leading-snug group-hover:text-brand">{pick(lang, p.titleEn, p.titleHi)}</span>
                        {p.files > 0 && (
                          <span className="mt-1 inline-flex items-center gap-1 text-xs text-muted">
                            <Icon name="pdf" size={13} /> {ui.pdf}
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Panel>

          <div className="space-y-6">
            <Panel title={t("home.leaders_card")} action={more("/officials")}>
              <ul className="divide-y divide-line">
                {leaders.map((l) => {
                  const initials = l.nameEn.replace(/^(Sh|Shri|Smt)\.?\s+/i, "").split(/[ .]+/).filter(Boolean).map((w) => w[0]).join("").slice(0, 2);
                  return (
                    <li key={l.id} className="flex items-center gap-4 px-5 py-4">
                      {l.photoUrl ? (
                        <Image src={l.photoUrl} alt="" width={72} height={72} className="h-[4.5rem] w-[4.5rem] shrink-0 object-cover" />
                      ) : (
                        <span className="grid h-[4.5rem] w-[4.5rem] shrink-0 place-items-center bg-ink font-display text-2xl font-bold text-signal" aria-hidden>
                          {initials}
                        </span>
                      )}
                      <div>
                        <p className="text-sm font-medium text-brand">{pick(lang, l.designationEn, l.designationHi)}</p>
                        <p className="mt-0.5 text-lg font-semibold leading-tight">{pick(lang, l.nameEn, l.nameHi)}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Panel>

            <Panel title={t("home.news_title")}>
              {events.upcoming.length > 0 && (
                <div className="border-b border-line bg-paper px-5 py-4">
                  <p className="text-sm font-semibold text-brand">{t("home.events_title")}</p>
                  <ul className="mt-2 space-y-1.5">
                    {events.upcoming.map((e) => (
                      <li key={e.id} className="text-[0.98rem]">
                        <span className="font-medium">{evDate(e.startsAt)}</span> · {pick(lang, e.titleEn, e.titleHi)}
                      </li>
                    ))}
                  </ul>
                  <Link href={`/${lang}/events`} className="mt-2 inline-block text-sm font-medium text-brand hover:underline">
                    {ui.viewAll} →
                  </Link>
                </div>
              )}
              <ul className="divide-y divide-line">
                {news.map((p) => {
                  const d = dateParts(p.publishedAt, lang);
                  return (
                    <li key={p.id}>
                      <Link href={`/${lang}/orders/${p.id}`} className="group block px-5 py-3.5 hover:bg-paper">
                        <span className="block text-xs text-muted">
                          {d.day} {d.month} {d.year}
                        </span>
                        <span className="line-clamp-2 text-[0.98rem] font-medium leading-snug group-hover:text-brand">{pick(lang, p.titleEn, p.titleHi)}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Panel>
          </div>
        </div>
      </section>

      {/* DIVISIONS */}
      <section className="bg-paper py-14 lg:py-16">
        <div className={wrap}>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className={h2}>{t("home.divisions_title")}</h2>
              <div className="rule mt-4" />
              <p className="mt-4 max-w-[52ch] text-muted">{t("home.divisions_sub")}</p>
            </div>
            {more("/divisions")}
          </div>
          <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {divisions.map((d) => (
              <DivisionCard key={d.slug} d={d} lang={lang} labels={labels} />
            ))}
          </div>
        </div>
      </section>

      {/* PHOTOS (only when photos have been uploaded from the admin panel) */}
      {photos.length > 0 && (
        <section className="py-14 lg:py-16">
          <div className={wrap}>
            <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className={h2}>{t("home.photos_title")}</h2>
                <p className="mt-2 text-muted">{t("home.photos_sub")}</p>
              </div>
              {more("/gallery")}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {photos.map((p, i) => (
                <figure key={p.id} className={`group relative overflow-hidden bg-ink ${i === 0 ? "col-span-2 row-span-2" : ""}`}>
                  <div className={`relative ${i === 0 ? "aspect-square" : "aspect-[4/3]"}`}>
                    <Photo src={p.url} alt={pick(lang, p.captionEn, p.captionHi)} fill sizes={i === 0 ? "(min-width: 640px) 50vw, 100vw" : "(min-width: 640px) 25vw, 50vw"} className="object-cover transition duration-500 group-hover:scale-[1.03]" />
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

      {/* GRIEVANCE | JOIN: the only place on the page that asks the visitor to act */}
      <section className="bg-ink py-14 text-light lg:py-16">
        <div className={`${wrap} grid gap-10 md:grid-cols-2 md:gap-0`}>
          <div className="md:pr-12">
            <h2 className="text-[1.5rem] leading-tight">{t("home.grievance_title")}</h2>
            <p className="mt-3 max-w-[40ch] text-light/80">{t("home.grievance_text")}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href={`/${lang}/grievance`} className="btn-gold">
                {t("grievance.title")}
              </Link>
              <Link href={`/${lang}/grievance/track`} className="btn-ghost">
                {ui.gTrackTitle}
              </Link>
            </div>
          </div>
          <div className="border-t border-white/15 pt-10 md:border-l md:border-t-0 md:pl-12 md:pt-0">
            <h2 className="text-[1.5rem] leading-tight">{t("home.join_title")}</h2>
            <p className="mt-3 max-w-[40ch] text-light/80">{t("home.join_text")}</p>
            <div className="mt-6">
              <Link href={`/${lang}/join`} className="btn-gold">
                {t("cta.join")}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
