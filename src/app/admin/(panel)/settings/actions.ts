"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { getDb, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { deleteBlobs } from "@/lib/blob";
import { secondLang, setOneLang } from "@/lib/i18n-form";

export async function saveSettings(form: FormData) {
  await requireAdmin(["super_admin"]);
  const db = getDb();
  const rows = await db.select({ key: schema.siteSettings.key, valueEn: schema.siteSettings.valueEn }).from(schema.siteSettings);
  const replaced: string[] = [];
  // The second column is Hindi or the language chosen on the page.
  const lang2 = secondLang(String(form.get("lang2") ?? ""));
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
    const v2 = String(form.get(`hi:${key}`) ?? "").trim().slice(0, 2000);
    const second = lang2 === "hi" ? { valueHi: v2 || null } : { i18n: setOneLang(schema.siteSettings.i18n, "value", lang2, v2) };
    await db.update(schema.siteSettings).set({ valueEn: en, ...second }).where(eq(schema.siteSettings.key, key));
  }
  // A replaced picture is removed from storage unless another setting still points at it.
  if (replaced.length) {
    const still = await db.select({ en: schema.siteSettings.valueEn }).from(schema.siteSettings);
    const inUse = new Set(still.map((r) => r.en));
    await deleteBlobs(replaced.filter((u) => !inUse.has(u)));
  }

  updateTag("settings");
  redirect(`/admin/settings?saved=1${lang2 === "hi" ? "" : `&lang=${lang2}`}`);
}
