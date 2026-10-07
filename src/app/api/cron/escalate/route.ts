import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getDb } from "@/db";

/**
 * Runs every day (see vercel.json). A grievance that is still open and has had no activity for the
 * number of days set in "grievance.escalate_days" is passed to the next level and the member can see it.
 * Protected by CRON_SECRET, which Vercel sends as a bearer token.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = getDb();
  const rows = (r: unknown) => ((r as { rows?: unknown[] }).rows ?? r) as Record<string, unknown>[];
  const days = Math.max(1, Number(rows(await db.execute(sql`select value_en as v from site_settings where key = 'grievance.escalate_days'`))[0]?.v) || 7);

  const moved = rows(
    await db.execute(sql`
      update grievances set level = level + 1, updated_at = now()
      where status in ('open', 'in_progress') and level < 3 and updated_at < now() - make_interval(days => ${days})
      returning id, level`),
  ) as { id: number; level: number }[];

  for (const g of moved) {
    await db.execute(sql`insert into grievance_events (grievance_id, kind, value, public) values (${g.id}, 'escalated', ${String(g.level)}, true)`);
  }
  return NextResponse.json({ escalated: moved.length, afterDays: days });
}
