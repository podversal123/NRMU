"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { getDb, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { secondLang, setOneLang } from "@/lib/i18n-form";

const s = (f: FormData, k: string, max = 200) => String(f.get(k) ?? "").trim().slice(0, max);
const idsOf = (f: FormData, name: string) => String(f.get(name) ?? "").split(",").filter(Boolean);

export async function saveNav(form: FormData) {
  await requireAdmin(["super_admin"]);
  const db = getDb();
  // The second label column is Hindi or the language chosen on the page.
  const lang2 = secondLang(s(form, "lang2", 5));
  const label2 = (id: string) => {
    const v = s(form, `nav_label2_${id}`);
    return lang2 === "hi" ? { labelHi: v || null } : { i18n: setOneLang(schema.navItems.i18n, "label", lang2, v) };
  };
  for (const id of [...idsOf(form, "navIds"), "new"]) {
    const labelEn = s(form, `nav_labelEn_${id}`);
    if (id === "new") {
      if (labelEn && s(form, "nav_href_new")) {
        await db.insert(schema.navItems).values({ area: ["footer", "links", "policy"].includes(s(form, "nav_area_new")) ? s(form, "nav_area_new") : "header", parentId: Number(s(form, "nav_parent_new")) || null, labelEn, ...(lang2 === "hi" ? { labelHi: s(form, "nav_label2_new") || null } : { i18n: s(form, "nav_label2_new") ? { label: { [lang2]: s(form, "nav_label2_new") } } : {} }), href: s(form, "nav_href_new"), sort: Number(s(form, "nav_sort_new")) || 99 });
      }
      continue;
    }
    if (form.get(`nav_delete_${id}`) === "on") {
      await db.delete(schema.navItems).where(eq(schema.navItems.id, Number(id)));
      continue;
    }
    if (!labelEn) continue;
    await db.update(schema.navItems).set({ labelEn, ...label2(id), href: s(form, `nav_href_${id}`), parentId: Number(s(form, `nav_parent_${id}`)) && Number(s(form, `nav_parent_${id}`)) !== Number(id) ? Number(s(form, `nav_parent_${id}`)) : null, sort: Number(s(form, `nav_sort_${id}`)) || 0, active: form.get(`nav_active_${id}`) === "on" }).where(eq(schema.navItems.id, Number(id)));
  }
  updateTag("nav");
  redirect(`/admin/navigation?saved=1${lang2 === "hi" ? "" : `&lang=${lang2}`}`);
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
