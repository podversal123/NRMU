"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb, schema } from "@/db";
import { requireAdmin, type AdminSession } from "@/lib/auth";

const STATUSES = ["open", "in_progress", "resolved", "closed"];

/** Loads the grievance if this admin may act on it: HQ staff always, a division admin only while it is with their division. */
async function load(admin: AdminSession, id: number) {
  const [g] = await getDb().select().from(schema.grievances).where(eq(schema.grievances.id, id)).limit(1);
  if (!g) redirect("/admin/grievances");
  if (admin.role === "division_admin" && !(g.divisionId === admin.divisionId && g.level === 1)) redirect(`/admin/grievances/${id}?denied=1`);
  return g;
}

export async function addNote(form: FormData) {
  const admin = await requireAdmin();
  const g = await load(admin, Number(form.get("id")));
  const message = String(form.get("message") ?? "").trim().slice(0, 2000);
  if (message) {
    const db = getDb();
    await db.insert(schema.grievanceEvents).values({ grievanceId: g.id, kind: "note", message, public: form.get("public") === "on", adminId: admin.id });
    await db.update(schema.grievances).set({ updatedAt: new Date() }).where(eq(schema.grievances.id, g.id));
  }
  redirect(`/admin/grievances/${g.id}?saved=1`);
}

export async function setStatus(form: FormData) {
  const admin = await requireAdmin();
  const g = await load(admin, Number(form.get("id")));
  const status = String(form.get("status") ?? "");
  if (STATUSES.includes(status) && status !== g.status) {
    const db = getDb();
    await db.update(schema.grievances).set({ status, updatedAt: new Date() }).where(eq(schema.grievances.id, g.id));
    await db.insert(schema.grievanceEvents).values({
      grievanceId: g.id,
      kind: "status",
      value: status,
      message: String(form.get("message") ?? "").trim().slice(0, 2000),
      public: true,
      adminId: admin.id,
    });
  }
  redirect(`/admin/grievances/${g.id}?saved=1`);
}

export async function setLevel(form: FormData) {
  const admin = await requireAdmin(["super_admin", "editor", "division_admin"]);
  const g = await load(admin, Number(form.get("id")));
  const level = Number(form.get("level"));
  // A division admin can only pass a grievance upwards (to level 2).
  const allowed = admin.role === "division_admin" ? level === 2 : [1, 2, 3].includes(level);
  if (allowed && level !== g.level) {
    const db = getDb();
    await db.update(schema.grievances).set({ level, updatedAt: new Date() }).where(and(eq(schema.grievances.id, g.id)));
    await db.insert(schema.grievanceEvents).values({ grievanceId: g.id, kind: "level", value: String(level), public: true, adminId: admin.id });
  }
  redirect(`/admin/grievances/${g.id}?saved=1`);
}
