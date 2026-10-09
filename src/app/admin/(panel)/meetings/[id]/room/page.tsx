import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import VideoCall from "@/components/VideoCall";
import { getDb, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { createToken, DailyError } from "@/lib/daily";
import { fmtTime, fmtWhen } from "@/lib/meetings";
import { Card, PageTitle } from "../../../../ui";

// Always depends on the signed-in admin and the clock, so it is rendered per request.
export const instant = false;
export const metadata = { title: "Video call" };

const HOUR = 3600 * 1000;

/** The host's way into the call. Only the super admin gets here, and the token carries the host's rights. */
export default async function HostRoom({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(["super_admin"]);
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const [m] = await getDb().select().from(schema.meetings).where(eq(schema.meetings.id, Number(id))).limit(1);
  if (!m) notFound();
  if (!m.roomName || !m.roomUrl) redirect(`/admin/meetings/${m.id}#video`);

  const now = Date.now();
  const back = (
    <Link href={`/admin/meetings/${m.id}`} className="inline-block py-2 text-sm font-semibold text-brand">
      ← Back to the meeting
    </Link>
  );

  if (now < m.startsAt.getTime() - HOUR) {
    return (
      <>
        <PageTitle title={m.titleEn} action={back} />
        <Card>
          <p className="font-medium">The room opens an hour before the meeting, at {fmtTime(new Date(m.startsAt.getTime() - HOUR))}.</p>
          <p className="mt-1 text-muted">The meeting is on {fmtWhen(m.startsAt)}.</p>
        </Card>
      </>
    );
  }
  if (now > m.endsAt.getTime() + HOUR) {
    return (
      <>
        <PageTitle title={m.titleEn} action={back} />
        <Card>
          <p className="font-medium">This call is over.</p>
        </Card>
      </>
    );
  }

  let token: string;
  try {
    token = await createToken({ room: m.roomName, name: admin.name, userId: `a${admin.id}`, owner: true, startsAt: m.startsAt, endsAt: m.endsAt, record: m.recordingOn && m.roomRecording });
  } catch (e) {
    console.error("Host token failed", e instanceof DailyError ? `${e.status} ${e.info}` : e);
    return (
      <>
        <PageTitle title={m.titleEn} action={back} />
        <Card>
          <p role="alert" className="font-semibold text-brand">The video service did not let you in. Please try again in a minute.</p>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageTitle title={m.titleEn} sub={fmtWhen(m.startsAt)} action={back} />
      <VideoCall
        url={m.roomUrl}
        token={token}
        backHref={`/admin/meetings/${m.id}`}
        showReason
        labels={{ loading: "Opening the video call…", left: "You have left the call.", again: "Join again", back: "Back to the meeting", error: "The video call could not be opened. Please try again." }}
      />
    </>
  );
}
