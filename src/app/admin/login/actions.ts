"use server";

import { eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb, schema } from "@/db";
import { endSession, startSession, verifyPassword } from "@/lib/auth";
import { clientKey, tooMany } from "@/lib/rate-limit";

export type LoginState = { error?: string };

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

export async function login(_prev: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };
  // Stops password guessing from one place, and stops a stranger from locking the real admin out by guessing again and again.
  if (await tooMany("login-ip", await clientKey(), 30, 600)) return { error: "Too many sign-in attempts from here. Please wait ten minutes and try again." };

  const db = getDb();
  const [u] = await db.select().from(schema.adminUsers).where(sql`lower(${schema.adminUsers.email}) = ${email}`).limit(1);

  if (u?.lockedUntil && u.lockedUntil > new Date()) {
    return { error: `Too many failed attempts. Try again in ${LOCK_MINUTES} minutes.` };
  }

  const ok = u && u.active && (await verifyPassword(password, u.passwordHash));
  if (!ok) {
    if (u) {
      const attempts = u.failedAttempts + 1;
      await db
        .update(schema.adminUsers)
        .set({
          failedAttempts: attempts >= MAX_ATTEMPTS ? 0 : attempts,
          lockedUntil: attempts >= MAX_ATTEMPTS ? sql`now() + interval '15 minutes'` : null,
        })
        .where(eq(schema.adminUsers.id, u.id));
    }
    return { error: "Incorrect email or password." };
  }

  await db.update(schema.adminUsers).set({ failedAttempts: 0, lockedUntil: null, lastLoginAt: new Date() }).where(eq(schema.adminUsers.id, u.id));
  await startSession(u.id);
  redirect("/admin");
}

export async function logout() {
  await endSession();
  redirect("/admin/login");
}
