import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";

export { hashPassword, verifyPassword } from "./hash";

/**
 * Member sign-in, kept apart from the admin sign-in on purpose: a different cookie, a different signing key
 * and a different claim inside, so a member's cookie can never be accepted as an admin's (or the other way round).
 * The cookie only says "this is member N until time T"; the member is looked up again on every request, so
 * suspending someone takes effect at once.
 */
const COOKIE = "nrmu_member";
const MAX_AGE = 14 * 24 * 60 * 60; // 14 days

const key = () => {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error("AUTH_SECRET is not configured");
  return `${s}|member`;
};
const sign = (payload: string) => createHmac("sha256", key()).update(payload).digest("base64url");

export type Member = typeof schema.members.$inferSelect;

export async function startMemberSession(memberId: number) {
  const payload = Buffer.from(JSON.stringify({ mid: memberId, aud: "member", exp: Date.now() + MAX_AGE * 1000 })).toString("base64url");
  (await cookies()).set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function endMemberSession() {
  (await cookies()).delete(COOKIE);
}

/** The signed-in member, or null. Only an active membership counts. */
export async function getMember(): Promise<Member | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const good = Buffer.from(sign(payload));
  const given = Buffer.from(sig);
  if (good.length !== given.length || !timingSafeEqual(good, given)) return null;
  let data: { mid?: number; aud?: string; exp?: number };
  try {
    data = JSON.parse(Buffer.from(payload, "base64url").toString());
  } catch {
    return null;
  }
  await connection(); // the expiry check reads the clock, which must happen at request time
  if (data.aud !== "member" || !data.mid || !data.exp || data.exp < Date.now()) return null;
  const [m] = await getDb().select().from(schema.members).where(eq(schema.members.id, data.mid)).limit(1);
  return m && m.status === "active" ? m : null;
}

export async function requireMember(lang: string): Promise<Member> {
  const m = await getMember();
  if (!m) redirect(`/${lang}/member/login`);
  return m;
}
