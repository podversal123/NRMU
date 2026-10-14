import Image from "next/image";
import Link from "next/link";
import Photo from "@/components/Photo";
import { notFound } from "next/navigation";
import { GrievanceEnvelope, MemberPocket, TrackTrain } from "@/components/CtaProps";
import DivisionList from "@/components/DivisionList";
import Icon from "@/components/Icon";
import QuickLinks from "@/components/QuickLinks";
import Ticker from "@/components/Ticker";
import { isLang, type Lang } from "@/lib/i18n";
import { getDivisionCards, getEvents, getGalleryPhotos, getPostsByCategory } from "@/lib/content";
import { getFeaturedLeaders, getLatestPosts, getNav, getSettings, getUi, pick, setting } from "@/lib/queries";

const wrap = "mx-auto max-w-wrap px-5 sm:px-8";
const h2 = "text-2xl font-bold lg:text-[2rem]";

function dateParts(iso: string, lang: Lang) {
  const d = new Date(iso + "T00:00:00");
  const loc = lang === "hi" ? "hi-IN" : "en-IN";
  return { day: d.getDate(), month: new Intl.DateTimeFormat(loc, { month: "short" }).format(d), year: d.getFullYear() };
}

/** A bordered panel with a title bar. */
function Panel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="min-w-0 overflow-hidden rounded-md border border-line bg-white shadow-[0_1px_2px_rgba(21,22,26,0.04),0_8px_24px_-12px_rgba(21,22,26,0.12)]">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-line bg-gradient-to-b from-paper/70 to-white px-5 py-3.5">
        <h2 className="flex min-w-0 items-center gap-2.5 text-xl font-semibold leading-tight">
          <span aria-hidden className="h-5 w-1 shrink-0 rounded-full bg-brand" />
          {title}
        </h2>
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

  const [s, ui, latest, leaders, photos, events, divisions, quick] = await Promise.all([
    getSettings(),
    getUi(lang),
    getLatestPosts(8),
    getFeaturedLeaders(),
    getGalleryPhotos(7, true),
    getEvents(0, 3),
    getDivisionCards(),
    getNav("quick"),
  ]);
  const t = (key: string) => setting(s, key, lang);
  const news = await getPostsByCategory(setting(s, "config.news.category", "en"), 4, false, latest.map((p) => p.id));
  const evDate = (iso: string) => new Intl.DateTimeFormat(lang === "hi" ? "hi-IN" : "en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" }).format(new Date(iso));
  const more = (href: string) => (
    <Link href={`/${lang}${href}`} className="-my-2.5 shrink-0 py-2.5 text-sm font-medium text-brand hover:underline">
      {ui.viewAll} →
    </Link>
  );
  const labels = { secretary: t("division.secretary_label"), president: t("division.president_label"), branches: ui.branches, branchSecretaries: ui.branchSecretaries, next: ui.next, previous: ui.previous };

  return (
    <>
      {/* LATEST ORDERS, moving slowly (pausable) */}
      <Ticker
        label={t("home.ticker_label")}
        items={latest.slice(0, 6).map((p) => ({ href: `/${lang}/orders/${p.id}`, text: pick(lang, p.titleEn, p.titleHi), date: new Intl.DateTimeFormat(lang === "hi" ? "hi-IN" : "en-IN", { dateStyle: "medium" }).format(new Date(p.publishedAt + "T00:00:00")) }))}
      />

      {/* BANNER: the featured office bearers, as one designed picture (for now; src/components/LeaderBanner.tsx is the photo-based version) */}
      {/* the wave at the bottom of the picture fades into the white page instead of ending in a hard edge */}
      <section className="bg-white">
        <h1 className="sr-only">{t("org.name")}</h1>
        <Image
          src="/banners/leaders-banner-indian-railways.png"
          alt={leaders.map((l) => `${pick(lang, l.nameEn, l.nameHi)}, ${pick(lang, l.designationEn, l.designationHi)}`).join("; ")}
          width={2061}
          height={763}
          priority
          sizes="100vw"
          quality={85}
          className="block h-auto w-full [mask-image:linear-gradient(to_bottom,#000_80%,transparent)]"
        />
      </section>

      <QuickLinks title={t("home.quick_title")} lang={lang} items={quick.map((q) => ({ id: q.id, href: q.href, label: pick(lang, q.labelEn, q.labelHi) }))} />

      {/* NOTICE BOARD | LEADERS + HIGHLIGHTS */}
      <section className="py-12 lg:py-14">
        <div className={`${wrap} grid grid-cols-1 items-start gap-6 lg:grid-cols-[1.3fr_1fr]`}>
          <Panel title={t("home.notice_title")} action={more("/orders")}>
            <ul className="divide-y divide-line">
              {latest.map((p) => {
                const d = dateParts(p.publishedAt, lang);
                return (
                  <li key={p.id}>
                    <Link href={`/${lang}/orders/${p.id}`} className="group flex items-start gap-4 px-5 py-3.5 transition-colors hover:bg-paper/70">
                      <time dateTime={p.publishedAt} className="w-14 shrink-0 overflow-hidden rounded border border-line bg-white text-center leading-none">
                        <span className="block bg-brand py-1 text-[0.68rem] font-semibold uppercase tracking-wide text-white">{d.month}</span>
                        <span className="block pt-1.5 text-[1.35rem] font-bold text-ink">{d.day}</span>
                        <span className="block pb-1.5 pt-0.5 text-[0.68rem] text-muted">{d.year}</span>
                      </time>
                      <span className="min-w-0">
                        <span className="line-clamp-3 text-[0.98rem] font-medium leading-snug group-hover:text-brand sm:line-clamp-2">{pick(lang, p.titleEn, p.titleHi)}</span>
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
                        <span className="mb-1 inline-flex items-center gap-1.5 text-xs font-medium text-brand">
                          <Icon name="calendar" size={13} /> {d.day} {d.month} {d.year}
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
      <section className="overflow-x-clip bg-brand-deep py-14 text-light lg:py-16">
        <div className={wrap}>
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className={`${h2} text-white`}>{t("home.divisions_title")}</h2>
            <Link href={`/${lang}/divisions`} className="-my-2.5 shrink-0 py-2.5 text-sm font-medium text-soft hover:text-white hover:underline">
              {ui.viewAll} →
            </Link>
          </div>
          <div className="mt-7">
            <DivisionList divisions={divisions} lang={lang} labels={labels} variant="deck" />
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
      {/* Each card is clickable as a whole (a hidden link covers it); the envelope and the ticket button sit above it.
          Tracking a grievance is linked from the grievance page itself.
          Flat colours and a hairline inner frame, like the membership card; the envelope and the pocket are the pictures. */}
      <section className="bg-paper py-16 lg:py-24">
        <div className={`${wrap} grid gap-6 md:grid-cols-2`}>
          <div className="act-card group relative isolate flex flex-col rounded-md border border-white/10 bg-ink px-7 pb-16 pt-9 text-light sm:px-10 sm:pt-11">
            {/* frame, rails and train, clipped to the card; the card itself lets the letter rise out over its top edge */}
            <span aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-md">
              <span className="absolute inset-2.5 rounded-[3px] border border-signal/20" />
              <span className="act-rails absolute inset-x-0 bottom-0 h-3" />
              <TrackTrain kind="steam" />
            </span>
            <GrievanceEnvelope href={`/${lang}/grievance`} title={t("grievance.title")} short={t("org.short")} />
            <h2 className="pr-40 text-[2rem] font-bold leading-[1.08] tracking-[-0.01em] text-balance text-white sm:pr-44 sm:text-[2.5rem]">
              {t("home.grievance_title")}
            </h2>
            <p className="mt-4 max-w-[44ch] leading-relaxed text-light/75 sm:text-lg">{t("home.grievance_text")}</p>
            {/* the whole card opens the same page; hidden from screen readers and the tab order, which use the button */}
            <Link href={`/${lang}/grievance`} aria-hidden tabIndex={-1} className="absolute inset-0 rounded-md" />
            <div className="mt-auto pt-9">
              <Link href={`/${lang}/grievance`} className="ticket-btn" style={{ "--notch": "var(--ink)" } as React.CSSProperties}>
                <span className="ticket-label">{t("grievance.title")}</span>
                <span aria-hidden className="ticket-stub">
                  <Icon name="arrow" size={20} />
                </span>
              </Link>
            </div>
          </div>

          <div className="act-card group relative isolate flex flex-col rounded-md border border-black/15 bg-brand px-7 pb-16 pt-9 text-light sm:px-10 sm:pt-11">
            <span aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-md">
              <span className="absolute inset-2.5 rounded-[3px] border border-soft/25" />
              <span className="act-rails absolute inset-x-0 bottom-0 h-3" />
              <TrackTrain kind="electric" />
            </span>
            <MemberPocket short={t("org.short")} name={t("org.name")} cardTitle={ui.memCardTitle} city={t("org.city")} />
            <h2 className="pr-40 text-[2rem] font-bold leading-[1.08] tracking-[-0.01em] text-balance text-white sm:pr-44 sm:text-[2.5rem]">
              {t("home.join_title")}
            </h2>
            <p className="mt-4 max-w-[44ch] leading-relaxed text-light/80 sm:text-lg">{t("home.join_text")}</p>
            {/* the whole card opens the same page; hidden from screen readers and the tab order, which use the button */}
            <Link href={`/${lang}/join`} aria-hidden tabIndex={-1} className="absolute inset-0 rounded-md" />
            <div className="mt-auto pt-9">
              <Link href={`/${lang}/join`} className="ticket-btn" style={{ "--notch": "var(--oxblood)" } as React.CSSProperties}>
                <span className="ticket-label">{t("cta.join")}</span>
                <span aria-hidden className="ticket-stub">
                  <Icon name="arrow" size={20} />
                </span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
