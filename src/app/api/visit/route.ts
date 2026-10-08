import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getDb } from "@/db";

const total = async () => {
  const r = await getDb().execute(sql`select coalesce(sum(visits), 0)::int as n from visit_counts`);
  return Number((r.rows[0] as { n: number }).n);
};

/** GET: current total. POST: count one visit (the browser sends it once per session), then return the total. */
export async function GET() {
  return NextResponse.json({ total: await total() }, { headers: { "Cache-Control": "public, s-maxage=60" } });
}

export async function POST() {
  await getDb().execute(sql`
    insert into visit_counts (day, visits) values ((now() at time zone 'Asia/Kolkata')::date, 1)
    on conflict (day) do update set visits = visit_counts.visits + 1`);
  return NextResponse.json({ total: await total() });
}
