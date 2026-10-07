"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { getDb, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";

export async function saveSettings(form: FormData) {
  await requireAdmin(["super_admin"]);
  const db = getDb();
  const rows = await db.select({ key: schema.siteSettings.key }).from(schema.siteSettings);
  for (const { key } of rows) {
    if (form.has(`img:${key}`)) {
      const url = String(form.get(`img:${key}`) ?? "").trim();
      if (url) await db.update(schema.siteSettings).set({ valueEn: url, valueHi: url }).where(eq(schema.siteSettings.key, key));
      continue;
    }
    if (!form.has(`en:${key}`)) continue;
    const en = String(form.get(`en:${key}`) ?? "").trim().slice(0, 2000);
    const hi = String(form.get(`hi:${key}`) ?? "").trim().slice(0, 2000);
    await db.update(schema.siteSettings).set({ valueEn: en, valueHi: hi || null }).where(eq(schema.siteSettings.key, key));
  }
  updateTag("settings");
  redirect("/admin/settings?saved=1");
}
