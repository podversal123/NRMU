"use server";

import { createHash } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { getDb, schema } from "@/db";
import { endMemberSession, getMember, hashPassword, startMemberSession, verifyPassword } from "@/lib/member-auth";
import { isLang, type Dict } from "@/lib/i18n";
import { clientKey, tooMany } from "@/lib/rate-limit";

export type LoginState = { error?: keyof Dict; mobile?: string };
export type PasswordState = { error?: keyof Dict; done?: boolean };

const MAX_ATTEMPTS = 5;
const clean = (v: FormDataEntryValue | null, max: number) => String(v ?? "").trim().slice(0, max);
const normMobile = (v: string) => v.replace(/[\s-]/g, "").replace(/^(\+91|91|0)(?=\d{10}$)/, "");
const langOf = (form: FormData) => (isLang(clean(form.get("lang"), 2)) ? clean(form.get("lang"), 2) : "en");

// A password is checked even when the number is unknown, so the answer takes the same time and a stranger cannot tell which numbers are registered.
let dummy: Promise<string> | null = null;
const dummyHash = () => (dummy ??= hashPassword("not-a-real-password"));

export async function memberLogin(_prev: LoginState, form: FormData): Promise<LoginState> {
  const lang = langOf(form);
  const mobile = normMobile(clean(form.get("mobile"), 20));
  const password = String(form.get("password") ?? "").slice(0, 200);
  if (!mobile || !password) return { error: "memLoginWrong", mobile };

  if (await tooMany("mlogin-ip", await clientKey(), 30, 600)) return { error: "errLimit", mobile };
  const who = createHash("sha256").update(mobile).digest("hex").slice(0, 16);
  if (await tooMany("mlogin-mobile", who, 10, 900)) return { error: "memLoginLocked", mobile };

  const db = getDb();
  const [m] = await db.select().from(schema.members).where(eq(schema.members.mobile, mobile)).limit(1);
  if (m?.lockedUntil && m.lockedUntil > new Date()) {
    await verifyPassword(password, m.passwordHash);
    return { error: "memLoginLocked", mobile };
  }

  const ok = (await verifyPassword(password, m?.passwordHash ?? (await dummyHash()))) && Boolean(m);
  if (!ok || !m) {
    if (m) {
      const attempts = m.failedAttempts + 1;
      await db
        .update(schema.members)
        .set({ failedAttempts: attempts >= MAX_ATTEMPTS ? 0 : attempts, lockedUntil: attempts >= MAX_ATTEMPTS ? sql`now() + interval '15 minutes'` : null })
        .where(eq(schema.members.id, m.id));
    }
    return { error: "memLoginWrong", mobile };
  }

  // The password is right; only now say what state the membership is in.
  if (m.status === "pending") return { error: "memLoginPending", mobile };
  if (m.status !== "active") return { error: "memLoginInactive", mobile };

  await db.update(schema.members).set({ failedAttempts: 0, lockedUntil: null, lastLoginAt: new Date() }).where(eq(schema.members.id, m.id));
  await startMemberSession(m.id);
  redirect(`/${lang}/member`);
}

export async function memberLogout(form: FormData) {
  await endMemberSession();
  redirect(`/${langOf(form)}`);
}

export async function changePassword(_prev: PasswordState, form: FormData): Promise<PasswordState> {
  const m = await getMember();
  if (!m) redirect(`/${langOf(form)}/member/login`);
  if (await tooMany("mpass-id", String(m.id), 10, 900)) return { error: "memLoginLocked" };

  const current = String(form.get("current") ?? "").slice(0, 200);
  const next = String(form.get("next") ?? "").slice(0, 200);
  const again = String(form.get("again") ?? "").slice(0, 200);
  if (!(await verifyPassword(current, m.passwordHash))) return { error: "memErrCurrent" };
  if (next.length < 8 || next.includes(m.mobile)) return { error: "memErrPassword" };
  if (next !== again) return { error: "memErrPassword2" };

  await getDb().update(schema.members).set({ passwordHash: await hashPassword(next), mustChangePassword: false }).where(eq(schema.members.id, m.id));
  refresh(); // the page behind the form (the card, the "choose a new password" notice) must show the new state
  return { done: true };
}
