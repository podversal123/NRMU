import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getDb } from "@/db";

/**
 * Messages from the video service: someone came in, someone left, a recording is ready.
 * Every real event carries a signature made with a secret only the video service and this site know
 * (X-Webhook-Signature over "<X-Webhook-Timestamp>.<body>"); anything unsigned or wrongly signed is refused.
 * The service must get a 200 within 8 seconds, so the work here is a few quick updates.
 */
export async function POST(request: Request) {
  // Real messages are a few hundred bytes. Refuse anything large before reading it.
  if (Number(request.headers.get("content-length") ?? 0) > 64 * 1024) return new NextResponse(null, { status: 413 });
  const body = await request.text();
  if (body.length > 64 * 1024) return new NextResponse(null, { status: 413 });
  let event: { type?: string; payload?: Record<string, unknown> };
  try {
    event = JSON.parse(body);
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  // The service's own test message when a webhook is set up carries no event type; it changes nothing.
  if (!event.type) return new NextResponse(null, { status: 200 });

  const secret = process.env.DAILY_WEBHOOK_SECRET;
  if (!secret) return new NextResponse(null, { status: 503 });
  const timestamp = request.headers.get("x-webhook-timestamp") ?? "";
  const given = Buffer.from(request.headers.get("x-webhook-signature") ?? "");
  const wanted = Buffer.from(createHmac("sha256", Buffer.from(secret, "base64")).update(`${timestamp}.${body}`).digest("base64"));
  if (given.length !== wanted.length || !timingSafeEqual(given, wanted)) return new NextResponse(null, { status: 401 });

  const p = event.payload ?? {};
  const db = getDb();
  try {
    if (event.type === "participant.joined" || event.type === "participant.left") {
      // user_id is "i<invitee id>" for invitees (set when the personal token is made); the host is "a<admin id>" and not tracked here.
      const m = /^i(\d{1,9})$/.exec(String(p.user_id ?? ""));
      if (m && p.room) {
        const invitee = Number(m[1]);
        if (event.type === "participant.joined") {
          const at = typeof p.joined_at === "number" ? new Date(p.joined_at * 1000) : new Date();
          await db.execute(sql`update meeting_invitees set attended = true, joined_at = coalesce(joined_at, ${at.toISOString()}::timestamptz), left_at = null
            where id = ${invitee} and meeting_id in (select id from meetings where room_name = ${String(p.room)})`);
        } else {
          await db.execute(sql`update meeting_invitees set left_at = now()
            where id = ${invitee} and attended and meeting_id in (select id from meetings where room_name = ${String(p.room)})`);
        }
      }
    } else if (event.type === "recording.ready-to-download") {
      if (p.room_name && p.recording_id) {
        await db.execute(sql`update meetings set recording_id = ${String(p.recording_id)}, recording_seconds = ${typeof p.duration === "number" ? Math.round(p.duration) : null}
          where room_name = ${String(p.room_name)}`);
      }
    }
  } catch (e) {
    // A failed write must not make the service think the message was lost forever; it will retry.
    console.error("Video webhook failed", event.type, e);
    return new NextResponse(null, { status: 500 });
  }
  return new NextResponse(null, { status: 200 });
}
