import { notFound } from "next/navigation";
import PageHero from "@/components/PageHero";
import { isLang, type Lang } from "@/lib/i18n";
import { getEvents, type EventRow } from "@/lib/content";
import { getSettings, getUi, pick, setting } from "@/lib/queries";
import { navTitle } from "@/lib/nav";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return { title: isLang(lang) ? await navTitle(lang, "/events") : undefined };
}

export const eventDate = (iso: string, lang: Lang) =>
  new Intl.DateTimeFormat(lang === "hi" ? "hi-IN" : "en-IN", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(iso));

export default async function EventsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const [ui, s, title, { upcoming, past }] = await Promise.all([getUi(lang), getSettings(), navTitle(lang, "/events"), getEvents()]);

  const Card = ({ e }: { e: EventRow }) => (
    <article className="border-t border-ink pt-5">
      <p className="font-display text-xl font-bold text-brand">{eventDate(e.startsAt, lang)}</p>
      <h3 className="mt-1 text-[1.3rem] leading-tight">{pick(lang, e.titleEn, e.titleHi)}</h3>
      <p className="mt-2 text-muted">
        {[pick(lang, e.venueEn, e.venueHi), pick(lang, e.divisionEn, e.divisionHi)].filter(Boolean).join(" · ")}
      </p>
      {(e.descriptionEn || e.descriptionHi) && <p className="mt-3 max-w-2xl whitespace-pre-line">{pick(lang, e.descriptionEn, e.descriptionHi)}</p>}
      {(e.agendaUrl || e.minutesUrl) && (
        <p className="mt-4 flex flex-wrap gap-5">
          {e.agendaUrl && <a href={e.agendaUrl} target="_blank" rel="noopener noreferrer" className="inline-block py-2.5 font-medium underline decoration-signal decoration-2 underline-offset-4 hover:text-brand">{ui.agenda}</a>}
          {e.minutesUrl && <a href={e.minutesUrl} target="_blank" rel="noopener noreferrer" className="inline-block py-2.5 font-medium underline decoration-signal decoration-2 underline-offset-4 hover:text-brand">{ui.minutes}</a>}
        </p>
      )}
    </article>
  );

  return (
    <>
      <PageHero lang={lang} title={title} sub={setting(s, "events.sub", lang)} crumbs={[{ href: `/${lang}`, label: ui.home }, { label: title }]} />
      <div className="mx-auto max-w-[1180px] space-y-16 px-5 py-14 sm:px-8">
        <section>
          <h2 className="text-[clamp(1.5rem,2.2vw,1.75rem)] font-medium">{ui.upcoming}</h2>
          <div className="mt-8 grid gap-x-12 gap-y-10 md:grid-cols-2">
            {upcoming.length ? upcoming.map((e) => <Card key={e.id} e={e} />) : <p className="text-muted">{ui.noUpcoming}</p>}
          </div>
        </section>
        {past.length > 0 && (
          <section>
            <h2 className="text-[clamp(1.5rem,2.2vw,1.75rem)] font-medium">{ui.past}</h2>
            <div className="mt-8 grid gap-x-12 gap-y-10 md:grid-cols-2">
              {past.map((e) => <Card key={e.id} e={e} />)}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
