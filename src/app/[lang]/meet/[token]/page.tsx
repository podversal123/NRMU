import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { eq } from "drizzle-orm";
import PageHero from "@/components/PageHero";
import { getDb, schema } from "@/db";
import { isLang } from "@/lib/i18n";
import { meetingState } from "@/lib/meetings";
import { getUi, pick } from "@/lib/queries";
import { answerInvitation } from "../actions";
import LocalTime from "./LocalTime";

// A private page for one person: it depends on the link and the clock, so it is rendered per request.
export const instant = false;

const TOKEN = /^[0-9a-f]{64}$/;

/** Personal links are private: never indexed, never cached. */
export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  return { title: (await getUi(lang)).mInvite, robots: { index: false, follow: false }, referrer: "no-referrer" };
}

export default function InvitationPage({ params, searchParams }: { params: Promise<{ lang: string; token: string }>; searchParams: Promise<{ saved?: string }> }) {
  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl px-5 py-20" aria-busy="true" />}>
      <Invitation params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Invitation({ params, searchParams }: { params: Promise<{ lang: string; token: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { lang, token } = await params;
  if (!isLang(lang)) notFound();
  const sp = await searchParams;
  await connection(); // the answer and the clock are different for every visit
  const ui = await getUi(lang);
  const crumbs = [{ href: `/${lang}`, label: ui.home }, { label: ui.mInvite }];

  const [row] = TOKEN.test(token)
    ? await getDb()
        .select({ invitee: schema.meetingInvitees, meeting: schema.meetings })
        .from(schema.meetingInvitees)
        .innerJoin(schema.meetings, eq(schema.meetings.id, schema.meetingInvitees.meetingId))
        .where(eq(schema.meetingInvitees.joinToken, token))
        .limit(1)
    : [];

  if (!row) {
    return (
      <>
        <PageHero lang={lang} title={ui.mBadLink} sub={ui.mBadLinkText} crumbs={crumbs} />
        <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8" />
      </>
    );
  }

  const { invitee, meeting: m } = row;
  const state = meetingState(m, new Date());
  const closed = state === "cancelled" || state === "completed" || state === "ended";
  const locale = lang === "hi" ? "hi-IN" : "en-IN";
  const day = new Intl.DateTimeFormat(locale, { dateStyle: "full", timeZone: "Asia/Kolkata" }).format(m.startsAt);
  const time = (d: Date) => new Intl.DateTimeFormat(locale, { timeStyle: "short", timeZone: "Asia/Kolkata" }).format(d);
  const venue = pick(lang, m.venueEn, m.venueHi);
  const agenda = (pick(lang, m.agendaEn, m.agendaHi) ?? "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const held = m.mode === "online" ? ui.mHeldOnline : m.mode === "hybrid" ? ui.mHeldHybrid : ui.mHeldInPerson;
  const replyLabel: Record<string, string> = { yes: ui.mYes, maybe: ui.mMaybe, no: ui.mNo, pending: ui.mNoReply };
  // The call opens 15 minutes before the start, for meetings that have a video room.
  const canJoin = !closed && m.mode !== "in_person" && Boolean(m.roomUrl) && Date.now() >= m.startsAt.getTime() - 15 * 60 * 1000;
  const note = state === "cancelled" ? ui.mCancelled : closed ? ui.mOver : state === "live" ? ui.mLive : null;

  return (
    <>
      <PageHero lang={lang} title={pick(lang, m.titleEn, m.titleHi)} sub={`${ui.mInvitedName}: ${invitee.name}`} crumbs={crumbs} />
      <div className="mx-auto max-w-3xl space-y-8 px-5 py-12 sm:px-8">
        {note && <p role="status" className="border-2 border-brand bg-white px-5 py-4 font-semibold text-brand-deep">{note}</p>}

        <dl className="grid grid-cols-1 gap-x-8 gap-y-5 border border-line bg-white p-6 sm:grid-cols-2 sm:p-8">
          <div>
            <dt className="text-sm font-semibold text-muted">{ui.mWhen}</dt>
            <dd className="mt-1 font-medium">{day}</dd>
            <dd className="text-muted">{time(m.startsAt)} – {time(m.endsAt)} (IST, UTC+5:30)</dd>
            <LocalTime start={m.startsAt.toISOString()} end={m.endsAt.toISOString()} locale={locale} label={ui.mYourTime} />
            {!closed && (
              <dd className="mt-2">
                <a href={`/${lang}/meet/${token}/calendar`} className="inline-flex min-h-11 items-center font-medium text-brand underline underline-offset-4">
                  {ui.mCalendar}
                </a>
              </dd>
            )}
          </div>
          <div>
            <dt className="text-sm font-semibold text-muted">{ui.mWhere}</dt>
            <dd className="mt-1 font-medium">{held}</dd>
            {venue && m.mode !== "online" && <dd className="text-muted">{venue}</dd>}
          </div>
        </dl>

        {agenda.length > 0 && (
          <section aria-labelledby="agenda-h" className="border border-line bg-white p-6 sm:p-8">
            <h2 id="agenda-h" className="text-xl font-medium">{ui.agenda}</h2>
            <ol className="mt-4 list-decimal space-y-2 pl-6">
              {agenda.map((a, i) => <li key={i}>{a}</li>)}
            </ol>
          </section>
        )}

        {canJoin ? (
          <Link href={`/${lang}/meet/${token}/call`} className="btn-primary flex min-h-14 items-center justify-center text-lg sm:inline-flex sm:px-10">
            {ui.mJoin}
          </Link>
        ) : (
          !closed && m.mode !== "in_person" && <p className="text-muted">{ui.mVideoLater}</p>
        )}

        {!closed && (
          <section aria-labelledby="rsvp-h" className="border border-line bg-white p-6 sm:p-8">
            <h2 id="rsvp-h" className="text-xl font-medium">{ui.mAttend}</h2>
            <form action={answerInvitation} className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <input type="hidden" name="token" value={token} />
              <input type="hidden" name="lang" value={lang} />
              {(["yes", "maybe", "no"] as const).map((a) => (
                <button key={a} type="submit" name="answer" value={a} aria-pressed={invitee.rsvp === a} className={`min-h-12 ${invitee.rsvp === a ? "btn-primary" : "rounded border-2 border-ink px-6 py-[0.65rem] font-medium text-ink hover:bg-ink hover:text-light"}`}>
                  {replyLabel[a]}
                </button>
              ))}
            </form>
            <p className="mt-4 text-sm text-muted">
              {ui.mYourReply}: <strong className="text-ink">{replyLabel[invitee.rsvp] ?? ui.mNoReply}</strong>
            </p>
            {sp.saved && <p role="status" className="mt-3 text-sm font-semibold text-brand-deep">{ui.mSaved}</p>}
          </section>
        )}
      </div>
    </>
  );
}
