"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { getDb, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { deleteBlobs } from "@/lib/blob";

const str = (f: FormData, k: string, max = 300) => String(f.get(k) ?? "").trim().slice(0, max);

export async function saveOfficial(form: FormData) {
  const admin = await requireAdmin();
  const idRaw = str(form, "id", 12);
  const nameEn = str(form, "nameEn");
  const designationId = Number(str(form, "designationId", 10)) || null;
  if (!nameEn || !designationId) redirect(`/admin/officials/${idRaw || "new"}?error=required`);

  // The role (scope) follows from the chosen designation, so it can never disagree with it.
  const [designation] = await getDb().select().from(schema.designations).where(eq(schema.designations.id, designationId!)).limit(1);
  if (!designation) redirect(`/admin/officials/${idRaw || "new"}?error=required`);
  const scope = designation.scope;
  let divisionId = Number(str(form, "divisionId", 10)) || null;
  // Division admins can only manage people of their own division, and not central posts.
  if (admin.role === "division_admin") {
    divisionId = admin.divisionId;
    if (scope === "central") redirect(`/admin/officials/${idRaw || "new"}?error=required`);
  }

  const values = {
    scope,
    divisionId,
    nameEn,
    nameHi: str(form, "nameHi") || null,
    designationId,
    placeLabel: str(form, "placeLabel") || null,
    branchId: Number(str(form, "branchId", 10)) || null,
    addressEn: str(form, "addressEn", 800) || null,
    phone: str(form, "phone", 30) || null,
    photoUrl: str(form, "photo", 600) || null,
    featured: admin.role === "division_admin" ? false : form.get("featured") === "on",
    active: form.get("active") === "on",
    sort: Number(str(form, "sort", 6)) || 0,
  };

  const db = getDb();
  let id = Number(idRaw);
  if (id) {
    const cond = admin.role === "division_admin" ? and(eq(schema.officeBearers.id, id), eq(schema.officeBearers.divisionId, admin.divisionId ?? -1)) : eq(schema.officeBearers.id, id);
    const [before] = await db.select({ photoUrl: schema.officeBearers.photoUrl }).from(schema.officeBearers).where(cond).limit(1);
    await db.update(schema.officeBearers).set(values).where(cond);
    if (before && before.photoUrl !== values.photoUrl) await deleteBlobs([before.photoUrl]);
  } else {
    const [row] = await db.insert(schema.officeBearers).values(values).returning({ id: schema.officeBearers.id });
    id = row.id;
  }
  updateTag("officials");
  updateTag("divisions");
  redirect(`/admin/officials/${id}?saved=1`);
}

export async function deleteOfficial(form: FormData) {
  const admin = await requireAdmin();
  const id = Number(form.get("id"));
  if (id) {
    const cond = admin.role === "division_admin" ? and(eq(schema.officeBearers.id, id), eq(schema.officeBearers.divisionId, admin.divisionId ?? -1)) : eq(schema.officeBearers.id, id);
    const [row] = await getDb().delete(schema.officeBearers).where(cond).returning({ photoUrl: schema.officeBearers.photoUrl });
    await deleteBlobs([row?.photoUrl]);
    updateTag("officials");
    updateTag("divisions");
  }
  redirect("/admin/officials?deleted=1");
}
