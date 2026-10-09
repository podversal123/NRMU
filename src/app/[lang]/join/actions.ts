"use server";

import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { hashPassword } from "@/lib/hash";
import type { Dict } from "@/lib/i18n";
import { clientKey, tooMany } from "@/lib/rate-limit";

export type JoinState = { ok?: boolean; error?: keyof Dict; values?: Record<string, string> };

const clean = (v: FormDataEntryValue | null, max: number) => String(v ?? "").trim().slice(0, max);

/**
 * A railway employee registers themselves. The membership starts as "pending"; a super admin or the division
 * admin approves it, and only then can the person sign in. Passwords are never sent back to the form.
 */
export async function submitJoin(_prev: JoinState, form: FormData): Promise<JoinState> {
  // Honeypot: real people never fill this hidden field.
  if (clean(form.get("website"), 50)) return { ok: true };

  const name = clean(form.get("name"), 120);
  const mobile = clean(form.get("mobile"), 20).replace(/[\s-]/g, "").replace(/^(\+91|91|0)(?=\d{10}$)/, "");
  const email = clean(form.get("email"), 160);
  const divisionId = Number(clean(form.get("division"), 10)) || null;
  const branchId = Number(clean(form.get("branch"), 10)) || null;
  const departmentId = Number(clean(form.get("department"), 10)) || null;
  const designation = clean(form.get("designation"), 120);
  const employeeId = clean(form.get("employeeId"), 40);
  const password = String(form.get("password") ?? "").slice(0, 200);
  const password2 = String(form.get("password2") ?? "").slice(0, 200);

  // Returned with every error so the form keeps what the visitor already typed (never the passwords).
  const values = {
    name,
    mobile,
    email,
    division: divisionId ? String(divisionId) : "",
    branch: branchId ? String(branchId) : "",
    department: departmentId ? String(departmentId) : "",
    designation,
    employeeId,
  };

  if (await tooMany("join-ip", await clientKey(), 20, 3600)) return { error: "errLimit", values };
  if (name.length < 2) return { error: "errName", values };
  if (!/^[6-9]\d{9}$/.test(mobile)) return { error: "errMobile", values };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "errEmail", values };
  if (!divisionId) return { error: "errDivision", values };
  if (!branchId) return { error: "memErrBranch", values };
  if (!departmentId) return { error: "memErrDepartment", values };
  if (password.length < 8 || password.includes(mobile)) return { error: "memErrPassword", values };
  if (password !== password2) return { error: "memErrPassword2", values };
  if (form.get("consent") !== "on") return { error: "memErrConsent", values };

  try {
    const db = getDb();
    // The branch must really belong to the chosen division, and the department must exist.
    const [branch] = await db.select({ divisionId: schema.branches.divisionId }).from(schema.branches).where(eq(schema.branches.id, branchId)).limit(1);
    if (!branch || branch.divisionId !== divisionId) return { error: "memErrBranch", values };
    const [dept] = await db.select({ id: schema.departments.id }).from(schema.departments).where(eq(schema.departments.id, departmentId)).limit(1);
    if (!dept) return { error: "memErrDepartment", values };

    const [taken] = await db.select({ id: schema.members.id }).from(schema.members).where(eq(schema.members.mobile, mobile)).limit(1);
    if (taken) return { error: "memErrExists", values };

    await db.insert(schema.members).values({
      name,
      mobile,
      email: email || null,
      employeeId: employeeId || null,
      divisionId,
      branchId,
      departmentId,
      designation: designation || null,
      passwordHash: await hashPassword(password),
      status: "pending",
      consentAt: new Date(),
    });
    return { ok: true };
  } catch (e) {
    // Two people sending the same number at the same moment: the unique index says no to the second one.
    if (e instanceof Error && /members_mobile_idx|duplicate key/i.test(`${e.message} ${(e as { cause?: Error }).cause?.message ?? ""}`)) return { error: "memErrExists", values };
    console.error("Registration failed", e);
    return { error: "errGeneric", values };
  }
}
