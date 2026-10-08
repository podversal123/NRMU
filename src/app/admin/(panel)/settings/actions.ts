"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { getDb, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { deleteBlobs } from "@/lib/blob";

export async function saveSettings(form: FormData) {
  await requireAdmin(["super_admin"]);
  const db = getDb();
  const rows = await db.select({ key: schema.siteSettings.key, valueEn: schema.siteSettings.valueEn }).from(schema.siteSettings);
  const replaced: string[] = [];
  for (const { key, valueEn } of rows) {
    if (form.has(`img:${key}`)) {
      const url = String(form.get(`img:${key}`) ?? "").trim();
      if (url) {
        await db.update(schema.siteSettings).set({ valueEn: url, valueHi: url }).where(eq(schema.siteSettings.key, key));
        if (valueEn && valueEn !== url) replaced.push(valueEn);
      }
      continue;
    }
    if (!form.has(`en:${key}`)) continue;
    const en = String(form.get(`en:${key}`) ?? "").trim().slice(0, 2000);
    const hi = String(form.get(`hi:${key}`) ?? "").trim().slice(0, 2000);
    await db.update(schema.siteSettings).set({ valueEn: en, valueHi: hi || null }).where(eq(schema.siteSettings.key, key));
  }
  // A replaced picture is removed from storage unless another setting still points at it.
  if (replaced.length) {
    const still = await db.select({ en: schema.siteSettings.valueEn }).from(schema.siteSettings);
    const inUse = new Set(still.map((r) => r.en));
    await deleteBlobs(replaced.filter((u) => !inUse.has(u)));
  }

  updateTag("settings");
  redirect("/admin/settings?saved=1");
}
