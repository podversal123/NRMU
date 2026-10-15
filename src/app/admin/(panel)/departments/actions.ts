"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { getDb, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { readI18n } from "@/lib/i18n-form";

const str = (f: FormData, k: string, max = 120) => String(f.get(k) ?? "").trim().slice(0, max);

export async function addDepartment(form: FormData) {
  await requireAdmin(["super_admin"]);
  const nameEn = str(form, "nameEn");
  if (!nameEn) redirect("/admin/departments?error=name");
  const db = getDb();
  const rows = await db.select({ sort: schema.departments.sort }).from(schema.departments);
  await db.insert(schema.departments).values({ nameEn, nameHi: str(form, "nameHi") || null, sort: Math.max(0, ...rows.map((r) => r.sort)) + 1 });
  updateTag("departments");
  redirect("/admin/departments?saved=1");
}

export async function saveDepartment(form: FormData) {
  await requireAdmin(["super_admin"]);
  const id = Number(form.get("id"));
  const nameEn = str(form, "nameEn");
  if (!id || !nameEn) redirect("/admin/departments?error=name");
  await getDb()
    .update(schema.departments)
    .set({ nameEn, nameHi: str(form, "nameHi") || null, i18n: readI18n(form, { name: 120 }), active: form.get("active") === "on", sort: Number(str(form, "sort", 6)) || 0 })
    .where(eq(schema.departments.id, id));
  updateTag("departments");
  redirect("/admin/departments?saved=1");
}
