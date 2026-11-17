import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { eq } from "drizzle-orm";
import VideoCall from "@/components/VideoCall";
import { getDb, schema } from "@/db";
import { agoraAppId, channelFor, createCallToken, inviteeUid, videoConfigured } from "@/lib/agora";
import { isLang } from "@/lib/i18n";
import { limited } from "@/lib/rate-limit";
import { callNames, meetingState } from "@/lib/meetings";
import { getUi, pick } from "@/lib/queries";

// A private page for one person: it depends on the link and the clock, so it is rendered per request.
export const instant = false;

const TOKEN = /^[0-9a-f]{64}$/;

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  return { title: (await getUi(lang)).mJoin, robots: { index: false, follow: false }, referrer: "no-referrer" };
}

export default function CallPage({ params }: { params: Promise<{ lang: string; token: string }> }) {
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-5 py-20" aria-busy="true" />}>
      <Call params={params} />
    </Suspense>
  );
}

async function Call({ params }: { params: Promise<{ lang: string; token: string }> }) {
  const { lang, token } = await params;
  if (!isLang(lang)) notFound();
  await connection();
  const back = `/${lang}/meet/${token}`;
  if (!TOKEN.test(token)) redirect(back);

  const [row] = await getDb()
    .select({ invitee: schema.meetingInvitees, meeting: schema.meetings })
    .from(schema.meetingInvitees)
    .innerJoin(schema.meetings, eq(schema.meetings.id, schema.meetingInvitees.meetingId))
    .where(eq(schema.meetingInvitees.joinToken, token))
    .limit(1);
  // Not a valid link, video not set up, an in-person meeting, or a meeting that is over: back to the invitation page, which explains.
  if (!row || !videoConfigured() || row.meeting.mode === "in_person") redirect(back);
  const { invitee, meeting: m } = row;
  const state = meetingState(m, new Date());
  if (state === "cancelled" || state === "completed" || state === "ended") redirect(back);
  if (Date.now() < m.startsAt.getTime() - 15 * 60 * 1000) redirect(back);

  const ui = await getUi(lang);
  // A person opens the call a handful of times at most; a leaked link used by a crowd or a script is slowed down here.
  if (await limited("call", { perAddress: 80, perSecret: { id: token, max: 12 }, windowSeconds: 600 })) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-16 text-center sm:px-8">
        <p role="alert" className="text-lg font-medium">{ui.mCallError}</p>
        <a href={back} className="mt-6 inline-flex min-h-12 items-center rounded border-2 border-brand px-6 font-medium text-brand hover:bg-brand hover:text-white">{ui.mCallBack}</a>
      </div>
    );
  }
  const callToken = createCallToken({ meetingId: m.id, uid: inviteeUid(invitee.id), endsAt: m.endsAt });
  const names = await callNames(m.id);

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-3 py-6 sm:px-6">
      <h1 className="px-2 text-xl font-medium sm:text-2xl">{pick(lang, m.titleEn, m.titleHi, m.i18n?.title)}</h1>
      <VideoCall
        appId={agoraAppId()}
        channel={channelFor(m.id)}
        token={callToken}
        uid={inviteeUid(invitee.id)}
        selfName={invitee.name}
        names={names}
        lang={lang}
        backHref={back}
        presenceToken={token}
        labels={{ loading: ui.mCallLoading, left: ui.mCallLeft, again: ui.mCallAgain, back: ui.mCallBack, error: ui.mCallError }}
      />
    </div>
  );
}
