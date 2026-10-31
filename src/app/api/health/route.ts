import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getDb } from "@/db";

/**
 * For an uptime monitor: answers 200 only when the database really answers, 503 when it does not.
 * It says nothing about the system (no versions, no names), only "ok" or "down".
 */
export async function GET() {
  const headers = { "Cache-Control": "no-store" };
  try {
    await getDb().execute(sql`select 1`);
    return NextResponse.json({ status: "ok" }, { headers });
  } catch {
    return NextResponse.json({ status: "down" }, { status: 503, headers });
  }
}
