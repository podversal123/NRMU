"use server";

import { and, asc, eq, gte, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { UiKey } from "@/lib/i18n";
import { clientKey, tooMany } from "@/lib/rate-limit";
import { getSettings } from "@/lib/queries";

const clean = (v: FormDataEntryValue | null, max: number) => String(v ?? "").trim().slice(0, max);
const normMobile = (v: string) => v.replace(/[\s-]/g, "").replace(/^(\+91|91|0)(?=\d{10}$)/, "");

export type SubmitState = { ok?: boolean; ticket?: string; error?: UiKey; values?: Record<string, string> };

export async function submitGrievance(_prev: SubmitState, form: FormData): Promise<SubmitState> {
  if (clean(form.get("website"), 50)) return { ok: true, ticket: "" }; // honeypot

  const name = clean(form.get("name"), 120);
  const mobile = normMobile(clean(form.get("mobile"), 20));
  const email = clean(form.get("email"), 160);
  const employeeId = clean(form.get("employeeId"), 40);
  const divisionId = Number(clean(form.get("division"), 10)) || null;
  const typeId = Number(clean(form.get("type"), 10)) || null;
  const subject = clean(form.get("subject"), 200);
  const details = clean(form.get("details"), 4000);
  const values = { name, mobile, email, employeeId, division: divisionId ? String(divisionId) : "", type: typeId ? String(typeId) : "", subject, details };

  if (await tooMany("grievance-ip", await clientKey(), 20, 3600)) return { error: "errLimit", values };
  if (name.length < 2) return { error: "errName", values };
  if (!/^[6-9]\d{9}$/.test(mobile)) return { error: "errMobile", values };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "errEmail", values };
  if (!divisionId) return { error: "errDivision", values };
  if (subject.length < 3) return { error: "errSubject", values };
  if (details.length < 20) return { error: "errDetails", values };

  try {
    const db = getDb();
    const [recent] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.grievances)
      .where(and(eq(schema.grievances.mobile, mobile), gte(schema.grievances.createdAt, sql`now() - interval '1 day'`)));
    if (recent.n >= 5) return { error: "errLimit", values };

    const s = await getSettings();
    const prefix = (s["grievance.ticket_prefix"]?.en || "NRMU").replace(/[^A-Za-z0-9]/g, "").slice(0, 8).toUpperCase();
    const now = new Date();
    const stamp = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}`;

    for (let attempt = 0; attempt < 5; attempt++) {
      const ticket = `${prefix}-${stamp}-${String(Math.floor(10000 + Math.random() * 90000))}`;
      const inserted = await db
        .insert(schema.grievances)
        .values({ ticket, name, mobile, email: email || null, employeeId: employeeId || null, divisionId, typeId, subject, details })
        .onConflictDoNothing({ target: schema.grievances.ticket })
        .returning({ id: schema.grievances.id });
      if (inserted.length) {
        await db.insert(schema.grievanceEvents).values({ grievanceId: inserted[0].id, kind: "created", value: "1", public: true });
        return { ok: true, ticket };
      }
    }
    return { error: "errGeneric", values };
  } catch {
    return { error: "errGeneric", values };
  }
}

export type TrackResult = {
  ticket: string;
  subject: string;
  status: string;
  levelName: string;
  createdAt: string;
  events: { kind: string; value: string | null; message: string; at: string; levelName: string | null }[];
};
export type TrackState = { error?: UiKey; result?: TrackResult; values?: { ticket: string; mobile: string } };

export async function trackGrievance(_prev: TrackState, form: FormData): Promise<TrackState> {
  const ticket = clean(form.get("ticket"), 40).toUpperCase();
  const mobile = normMobile(clean(form.get("mobile"), 20));
  const values = { ticket, mobile };
  if (!ticket || !mobile) return { error: "errTicket", values };
  // A ticket number and a mobile number must both match; this stops anyone trying many of them.
  if (await tooMany("track-ip", await clientKey(), 60, 600)) return { error: "errLimit", values };

  const db = getDb();
  const [g] = await db
    .select()
    .from(schema.grievances)
    .where(and(eq(schema.grievances.ticket, ticket), eq(schema.grievances.mobile, mobile)))
    .limit(1);
  if (!g) return { error: "gNotFound", values };

  const events = await db
    .select()
    .from(schema.grievanceEvents)
    .where(and(eq(schema.grievanceEvents.grievanceId, g.id), eq(schema.grievanceEvents.public, true)))
    .orderBy(asc(schema.grievanceEvents.createdAt), asc(schema.grievanceEvents.id));
  const s = await getSettings();
  // Names are returned in both languages as "en|hi"; the page picks the right one.
  const level = (n: number | string | null) => (n ? `${s[`grievance.level.${n}`]?.en ?? ""}|${s[`grievance.level.${n}`]?.hi ?? s[`grievance.level.${n}`]?.en ?? ""}` : null);

  return {
    values,
    result: {
      ticket: g.ticket,
      subject: g.subject,
      status: g.status,
      levelName: level(g.level) ?? "",
      createdAt: g.createdAt.toISOString(),
      events: events.map((e) => ({
        kind: e.kind,
        value: e.value,
        message: e.message,
        at: e.createdAt.toISOString(),
        levelName: e.kind === "level" || e.kind === "escalated" || e.kind === "created" ? level(e.value) : null,
      })),
    },
  };
}
