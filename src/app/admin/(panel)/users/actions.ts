"use server";

import { eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb, schema } from "@/db";
import { hashPassword, requireAdmin } from "@/lib/auth";

const s = (f: FormData, k: string, max = 200) => String(f.get(k) ?? "").trim().slice(0, max);
const ROLES = ["super_admin", "editor", "division_admin"];

export async function addUser(form: FormData) {
  await requireAdmin(["super_admin"]);
  const email = s(form, "email").toLowerCase();
  const name = s(form, "name");
  const role = ROLES.includes(s(form, "role")) ? s(form, "role") : "editor";
  const password = String(form.get("password") ?? "");
  const divisionId = Number(s(form, "divisionId", 10)) || null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !name) redirect("/admin/users?error=details");
  if (password.length < 10) redirect("/admin/users?error=password");
  if (role === "division_admin" && !divisionId) redirect("/admin/users?error=division");
  const db = getDb();
  const [exists] = await db.select({ id: schema.adminUsers.id }).from(schema.adminUsers).where(sql`lower(${schema.adminUsers.email}) = ${email}`).limit(1);
  if (exists) redirect("/admin/users?error=exists");
  await db.insert(schema.adminUsers).values({ email, name, role, divisionId: role === "division_admin" ? divisionId : null, passwordHash: await hashPassword(password) });
  redirect("/admin/users?saved=1");
}

export async function setUserActive(form: FormData) {
  const me = await requireAdmin(["super_admin"]);
  const id = Number(form.get("id"));
  if (id && id !== me.id) {
    await getDb().update(schema.adminUsers).set({ active: form.get("active") === "1" }).where(eq(schema.adminUsers.id, id));
  }
  redirect("/admin/users?saved=1");
}

export async function resetPassword(form: FormData) {
  await requireAdmin(["super_admin"]);
  const id = Number(form.get("id"));
  const password = String(form.get("password") ?? "");
  if (!id || password.length < 10) redirect("/admin/users?error=password");
  await getDb().update(schema.adminUsers).set({ passwordHash: await hashPassword(password), failedAttempts: 0, lockedUntil: null }).where(eq(schema.adminUsers.id, id));
  redirect("/admin/users?saved=1");
}
