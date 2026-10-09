import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getAdmin } from "@/lib/auth";
import { DailyError, recordingLink } from "@/lib/daily";

/**
 * Opens a meeting's recording. The recording stays at the video service; this makes a fresh one-hour
 * address each time, and only for the super admin, so the address cannot be shared around for long.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdmin();
  if (!admin || admin.role !== "super_admin") return NextResponse.redirect(new URL("/admin/login", request.url));

  const { id } = await params;
  if (!/^\d+$/.test(id)) return new NextResponse("Not found", { status: 404 });
  const [m] = await getDb().select({ recordingId: schema.meetings.recordingId }).from(schema.meetings).where(eq(schema.meetings.id, Number(id))).limit(1);
  if (!m?.recordingId) return new NextResponse("There is no recording for this meeting.", { status: 404 });

  try {
    const link = await recordingLink(m.recordingId);
    const res = NextResponse.redirect(link, 302);
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (e) {
    console.error("Recording link failed", e instanceof DailyError ? `${e.status} ${e.info}` : e);
    return new NextResponse("The recording could not be opened right now. Please try again in a minute.", { status: 502 });
  }
}
