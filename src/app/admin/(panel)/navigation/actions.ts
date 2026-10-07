"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { getDb, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";

const s = (f: FormData, k: string, max = 200) => String(f.get(k) ?? "").trim().slice(0, max);
const idsOf = (f: FormData, name: string) => String(f.get(name) ?? "").split(",").filter(Boolean);

export async function saveNav(form: FormData) {
  await requireAdmin(["super_admin"]);
  const db = getDb();
  for (const id of [...idsOf(form, "navIds"), "new"]) {
    const labelEn = s(form, `nav_labelEn_${id}`);
    if (id === "new") {
      if (labelEn && s(form, "nav_href_new")) {
        await db.insert(schema.navItems).values({ area: s(form, "nav_area_new") === "footer" ? "footer" : "header", labelEn, labelHi: s(form, "nav_labelHi_new") || null, href: s(form, "nav_href_new"), sort: Number(s(form, "nav_sort_new")) || 99 });
      }
      continue;
    }
    if (form.get(`nav_delete_${id}`) === "on") {
      await db.delete(schema.navItems).where(eq(schema.navItems.id, Number(id)));
      continue;
    }
    if (!labelEn) continue;
    await db.update(schema.navItems).set({ labelEn, labelHi: s(form, `nav_labelHi_${id}`) || null, href: s(form, `nav_href_${id}`), sort: Number(s(form, `nav_sort_${id}`)) || 0, active: form.get(`nav_active_${id}`) === "on" }).where(eq(schema.navItems.id, Number(id)));
  }
  updateTag("nav");
  redirect("/admin/navigation?saved=1");
}

export async function saveQuick(form: FormData) {
  await requireAdmin(["super_admin"]);
  const db = getDb();
  for (const id of [...idsOf(form, "quickIds"), "new"]) {
    const labelEn = s(form, `q_labelEn_${id}`);
    if (id === "new") {
      if (labelEn && s(form, "q_href_new")) {
        await db.insert(schema.quickLinks).values({ labelEn, labelHi: s(form, "q_labelHi_new") || null, href: s(form, "q_href_new"), icon: s(form, "q_icon_new") || "doc", sort: Number(s(form, "q_sort_new")) || 99 });
      }
      continue;
    }
    if (form.get(`q_delete_${id}`) === "on") {
      await db.delete(schema.quickLinks).where(eq(schema.quickLinks.id, Number(id)));
      continue;
    }
    if (!labelEn) continue;
    await db.update(schema.quickLinks).set({ labelEn, labelHi: s(form, `q_labelHi_${id}`) || null, href: s(form, `q_href_${id}`), icon: s(form, `q_icon_${id}`) || "doc", sort: Number(s(form, `q_sort_${id}`)) || 0, active: form.get(`q_active_${id}`) === "on" }).where(eq(schema.quickLinks.id, Number(id)));
  }
  updateTag("nav");
  redirect("/admin/navigation?saved=1");
}

export async function saveChips(form: FormData) {
  await requireAdmin(["super_admin"]);
  const terms = s(form, "terms", 1000).split(/\n|,/).map((t) => t.trim()).filter(Boolean).slice(0, 12);
  const db = getDb();
  await db.delete(schema.searchChips);
  if (terms.length) await db.insert(schema.searchChips).values(terms.map((term, sort) => ({ term, sort })));
  updateTag("nav");
  redirect("/admin/navigation?saved=1");
}
