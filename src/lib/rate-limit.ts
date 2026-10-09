import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { sql } from "drizzle-orm";
import { getDb } from "@/db";

/**
 * A shared counter for "how many times did this person do this in the last few minutes".
 *
 * It lives in the database, not in memory, because the site runs on many short-lived servers at once and
 * each would otherwise keep its own count. Counts are kept per fixed time window and old windows are swept away.
 * Nobody's address is stored: the key holds a one-way hash of it.
 *
 * Limits are deliberately generous (railway offices share one internet address among many people); they stop
 * scripts and guessing, not ordinary use. If the counter itself cannot be reached the request is allowed,
 * so a database hiccup does not lock everybody out.
 */
export async function clientKey(): Promise<string> {
  const h = await headers();
  // On Vercel the platform sets these itself, so a visitor cannot choose them.
  const ip = (h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0] ?? "unknown").trim();
  return createHash("sha256").update(`${process.env.AUTH_SECRET ?? ""}|${ip}`).digest("hex").slice(0, 24);
}

/** Counts one use. Returns true when the limit for this window has been passed (the caller should refuse). */
export async function tooMany(bucket: string, who: string, limit: number, windowSeconds: number): Promise<boolean> {
  try {
    const db = getDb();
    const key = `${bucket}:${who}`;
    const res = (await db.execute(sql`
      insert into rate_limits (key, window_start, hits)
      values (${key}, to_timestamp(floor(extract(epoch from now()) / ${windowSeconds}::int) * ${windowSeconds}::int), 1)
      on conflict (key, window_start) do update set hits = rate_limits.hits + 1
      returning hits`)) as unknown as { rows?: { hits: number }[] } & { hits: number }[];
    const hits = Number((res.rows ?? res)[0]?.hits ?? 0);
    // Now and then, sweep away windows from yesterday.
    if (Math.random() < 0.01) await db.execute(sql`delete from rate_limits where window_start < now() - interval '1 day'`);
    return hits > limit;
  } catch (e) {
    console.error("Rate limiter unavailable, allowing the request", e);
    return false;
  }
}

/** Both checks at once: this person's own address and, optionally, the one secret they are using. */
export async function limited(bucket: string, opts: { perAddress: number; perSecret?: { id: string; max: number }; windowSeconds: number }): Promise<boolean> {
  const [byAddress, bySecret] = await Promise.all([
    tooMany(`${bucket}-ip`, await clientKey(), opts.perAddress, opts.windowSeconds),
    opts.perSecret ? tooMany(`${bucket}-id`, opts.perSecret.id.slice(0, 40), opts.perSecret.max, opts.windowSeconds) : Promise.resolve(false),
  ]);
  return byAddress || bySecret;
}
