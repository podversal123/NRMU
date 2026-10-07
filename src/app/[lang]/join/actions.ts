"use server";

import { and, eq, gte, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { Dict } from "@/lib/i18n";

export type JoinState = { ok?: boolean; error?: keyof Dict; values?: Record<string, string> };

const clean = (v: FormDataEntryValue | null, max: number) => String(v ?? "").trim().slice(0, max);

export async function submitJoin(_prev: JoinState, form: FormData): Promise<JoinState> {
  // Honeypot: real people never fill this hidden field.
  if (clean(form.get("website"), 50)) return { ok: true };

  const name = clean(form.get("name"), 120);
  const mobile = clean(form.get("mobile"), 20).replace(/[\s-]/g, "").replace(/^(\+91|91|0)(?=\d{10}$)/, "");
  const email = clean(form.get("email"), 160);
  const divisionId = Number(clean(form.get("division"), 10)) || null;
  const designation = clean(form.get("designation"), 120);
  const employeeId = clean(form.get("employeeId"), 40);
  const message = clean(form.get("message"), 1000);

  // Returned with every error so the form keeps what the visitor already typed.
  const values = { name, mobile, email, division: divisionId ? String(divisionId) : "", designation, employeeId, message };
  if (name.length < 2) return { error: "errName", values };
  if (!/^[6-9]\d{9}$/.test(mobile)) return { error: "errMobile", values };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "errEmail", values };
  if (!divisionId) return { error: "errDivision", values };

  try {
    const db = getDb();
    const [recent] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.joinRequests)
      .where(and(eq(schema.joinRequests.mobile, mobile), gte(schema.joinRequests.createdAt, sql`now() - interval '1 day'`)));
    if (recent.n >= 3) return { error: "errLimit", values };

    await db.insert(schema.joinRequests).values({
      name,
      mobile,
      email: email || null,
      divisionId,
      designation: designation || null,
      employeeId: employeeId || null,
      message: message || null,
    });
    return { ok: true };
  } catch {
    return { error: "errGeneric", values };
  }
}
