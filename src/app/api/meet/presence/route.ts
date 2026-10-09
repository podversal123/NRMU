import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { limited } from "@/lib/rate-limit";

const TOKEN = /^[0-9a-f]{64}$/;

/**
 * The call screen tells us when an invitee came in and when they left. The invitee's own secret is the proof,
 * and it only counts around the meeting (from 30 minutes before to two hours after), so an old link cannot
 * rewrite who attended.
 */
export async function POST(request: Request) {
  let body: { token?: unknown; event?: unknown };
  try {
    body = await request.json();
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  const token = typeof body.token === "string" ? body.token : "";
  if (!TOKEN.test(token) || (body.event !== "joined" && body.event !== "left")) return new NextResponse(null, { status: 400 });

  if (await limited("presence", { perAddress: 300, perSecret: { id: token, max: 40 }, windowSeconds: 600 })) {
    return new NextResponse(null, { status: 429, headers: { "Retry-After": "300" } });
  }
  const db = getDb();
  const inWindow = sql`exists (select 1 from meetings m where m.id = meeting_invitees.meeting_id and m.status = 'scheduled'
    and now() >= m.starts_at - interval '30 minutes' and now() <= m.ends_at + interval '2 hours')`;
  if (body.event === "joined") {
    await db.execute(sql`update meeting_invitees set attended = true, joined_at = coalesce(joined_at, now()), left_at = null where join_token = ${token} and ${inWindow}`);
  } else {
    await db.execute(sql`update meeting_invitees set left_at = now() where join_token = ${token} and attended and ${inWindow}`);
  }
  return new NextResponse(null, { status: 204 });
}
