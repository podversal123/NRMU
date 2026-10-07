"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { getDb, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { toHtml } from "@/lib/text";

export async function savePage(form: FormData) {
  await requireAdmin(["super_admin", "editor"]);
  const id = Number(form.get("id"));
  const titleEn = String(form.get("titleEn") ?? "").trim().slice(0, 300);
  if (!id || !titleEn) redirect(`/admin/pages/${id || ""}?error=1`);
  const hiHtml = toHtml(String(form.get("contentHi") ?? ""));
  await getDb()
    .update(schema.pages)
    .set({
      titleEn,
      titleHi: String(form.get("titleHi") ?? "").trim().slice(0, 300) || null,
      contentHtml: toHtml(String(form.get("content") ?? "")),
      contentHtmlHi: hiHtml || null,
      updatedAt: new Date(),
    })
    .where(eq(schema.pages.id, id));
  updateTag("pages");
  redirect(`/admin/pages/${id}?saved=1`);
}
