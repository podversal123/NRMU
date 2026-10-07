"use server";

import { eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { getDb, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { slugify } from "@/lib/text";

const str = (f: FormData, k: string, max = 300) => String(f.get(k) ?? "").trim().slice(0, max);
const roles = ["super_admin", "editor"] as const;

export async function saveDivision(form: FormData) {
  await requireAdmin([...roles]);
  const idRaw = str(form, "id", 12);
  const nameEn = str(form, "nameEn");
  if (!nameEn) redirect(`/admin/divisions/${idRaw || "new"}?error=1`);
  const values = {
    nameEn,
    nameHi: str(form, "nameHi") || null,
    descriptionEn: str(form, "descriptionEn", 1000) || null,
    descriptionHi: str(form, "descriptionHi", 1000) || null,
    sort: Number(str(form, "sort", 6)) || 0,
    active: form.get("active") === "on",
  };
  const db = getDb();
  let id = Number(idRaw);
  if (id) {
    await db.update(schema.divisions).set(values).where(eq(schema.divisions.id, id));
  } else {
    const base = slugify(nameEn) || "division";
    const [{ n }] = (await db.execute(sql`select count(*)::int as n from divisions where slug = ${base} or slug like ${base + "-%"}`)).rows as { n: number }[];
    const [row] = await db.insert(schema.divisions).values({ ...values, slug: n ? `${base}-${Number(n) + 1}` : base }).returning({ id: schema.divisions.id });
    id = row.id;
  }
  updateTag("divisions");
  redirect(`/admin/divisions/${id}?saved=1`);
}

export async function addBranch(form: FormData) {
  await requireAdmin([...roles]);
  const divisionId = Number(form.get("divisionId"));
  const names = str(form, "names", 2000).split(/\n|,/).map((n) => n.trim()).filter(Boolean);
  if (divisionId && names.length) {
    const db = getDb();
    const [{ m }] = (await db.execute(sql`select coalesce(max(sort), -1) + 1 as m from branches where division_id = ${divisionId}`)).rows as { m: number }[];
    await db.insert(schema.branches).values(names.map((nameEn, i) => ({ divisionId, nameEn, sort: Number(m) + i })));
    updateTag("divisions");
  }
  redirect(`/admin/divisions/${divisionId}?saved=1`);
}

export async function deleteBranch(form: FormData) {
  await requireAdmin([...roles]);
  const id = Number(form.get("id"));
  const divisionId = Number(form.get("divisionId"));
  if (id) {
    await getDb().delete(schema.branches).where(eq(schema.branches.id, id));
    updateTag("divisions");
  }
  redirect(`/admin/divisions/${divisionId}?saved=1`);
}
