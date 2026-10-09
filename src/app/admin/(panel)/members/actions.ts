"use server";

import { randomInt } from "node:crypto";
import { and, eq, inArray, sql, type SQL } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb, schema } from "@/db";
import { requireAdmin, type AdminSession } from "@/lib/auth";
import { hashPassword } from "@/lib/hash";

const { members } = schema;
const str = (f: FormData, k: string, max = 200) => String(f.get(k) ?? "").trim().slice(0, max);
const num = (f: FormData, k: string) => Number(str(f, k, 10)) || null;

/** Super admins manage every member; a division admin only the members of their own division. Nobody else touches members. */
const actor = () => requireAdmin(["super_admin", "division_admin"]);
const scope = (a: AdminSession): SQL | undefined => (a.role === "division_admin" ? eq(members.divisionId, a.divisionId ?? -1) : undefined);

const NEXT: Record<string, { to: string; from: string[] }> = {
  approve: { to: "active", from: ["pending"] },
  reject: { to: "rejected", from: ["pending"] },
  suspend: { to: "suspended", from: ["active"] },
  reactivate: { to: "active", from: ["suspended", "rejected"] },
};

/** The same change for every ticked member. Approving is also what gives the membership its number. */
export async function bulkMembers(form: FormData) {
  const a = await actor();
  const intent = str(form, "intent", 12);
  const step = NEXT[intent];
  const ids = form.getAll("ids").map(Number).filter(Boolean).slice(0, 500);
  const back = str(form, "back", 300).startsWith("/admin/members") ? str(form, "back", 300) : "/admin/members";
  if (!step || !ids.length) redirect(back);

  const where = and(inArray(members.id, ids), inArray(members.status, step.from), scope(a));
  if (step.to === "active") {
    await getDb().execute(sql`
      update members set status = 'active', approved_by = ${a.id}, approved_at = coalesce(approved_at, now()),
        membership_no = coalesce(membership_no, 'NRMU-' || lpad(id::text, 6, '0')), failed_attempts = 0, locked_until = null
      where id in (${sql.join(ids.map((i) => sql`${i}`), sql`, `)}) and status in (${sql.join(step.from.map((s) => sql`${s}`), sql`, `)})
        ${a.role === "division_admin" ? sql`and division_id = ${a.divisionId ?? -1}` : sql``}`);
  } else {
    await getDb().update(members).set({ status: step.to }).where(where);
  }
  redirect(`${back}${back.includes("?") ? "&" : "?"}done=${intent}`);
}

export async function saveMember(form: FormData) {
  const a = await actor();
  const id = Number(form.get("id"));
  if (!id) redirect("/admin/members");
  const name = str(form, "name", 120);
  const email = str(form, "email", 160);
  const divisionId = a.role === "division_admin" ? a.divisionId : num(form, "divisionId");
  const branchId = num(form, "branchId");
  if (name.length < 2 || !divisionId) redirect(`/admin/members/${id}?error=required`);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) redirect(`/admin/members/${id}?error=email`);

  const db = getDb();
  if (branchId) {
    const [b] = await db.select({ divisionId: schema.branches.divisionId }).from(schema.branches).where(eq(schema.branches.id, branchId)).limit(1);
    if (!b || b.divisionId !== divisionId) redirect(`/admin/members/${id}?error=branch`);
  }
  const valid = str(form, "validUntil", 10);
  await db
    .update(members)
    .set({
      name,
      email: email || null,
      employeeId: str(form, "employeeId", 40) || null,
      divisionId,
      branchId,
      departmentId: num(form, "departmentId"),
      designation: str(form, "designation", 120) || null,
      validUntil: /^\d{4}-\d{2}-\d{2}$/.test(valid) ? valid : null,
    })
    .where(and(eq(members.id, id), scope(a)));
  redirect(`/admin/members/${id}?saved=1`);
}

// Letters and digits that cannot be mistaken for each other when read out over the phone.
const ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
const makeTemp = () => Array.from({ length: 10 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");

export type ResetState = { temp?: string; error?: string };

/** Gives a member a temporary password (shown once, here only) and makes them choose their own at the next sign-in. */
export async function resetMemberPassword(_prev: ResetState, form: FormData): Promise<ResetState> {
  const a = await actor();
  const id = Number(form.get("id"));
  if (!id) return { error: "No member selected." };
  const temp = makeTemp();
  const rows = await getDb()
    .update(members)
    .set({ passwordHash: await hashPassword(temp), mustChangePassword: true, failedAttempts: 0, lockedUntil: null })
    .where(and(eq(members.id, id), scope(a)))
    .returning({ id: members.id });
  return rows.length ? { temp } : { error: "You cannot change this member." };
}

/** Only a registration that was turned down can be erased (a person's right to have their data removed). */
export async function deleteMember(form: FormData) {
  await requireAdmin(["super_admin"]);
  const id = Number(form.get("id"));
  if (id) await getDb().delete(members).where(and(eq(members.id, id), eq(members.status, "rejected")));
  redirect("/admin/members?status=rejected&done=deleted");
}
