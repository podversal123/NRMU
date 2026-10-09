"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { getDb, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { deleteBlobs, isOwnBlobUrl } from "@/lib/blob";

const str = (f: FormData, k: string, max = 200) => String(f.get(k) ?? "").trim().slice(0, max);
const roles = ["super_admin", "editor"] as const;
const WINGS = ["women", "youth"] as const;
const wingOf = (f: FormData) => WINGS.find((w) => w === str(f, "wing", 8)) ?? "women";
const phoneOf = (v: string) => {
  const d = v.replace(/[^\d+]/g, "");
  return d.replace(/\D/g, "").length >= 6 ? d.slice(0, 16) : null;
};

function values(form: FormData) {
  const photo = str(form, "photo", 600);
  return {
    nameEn: str(form, "nameEn"),
    nameHi: str(form, "nameHi") || null,
    designationEn: str(form, "designationEn") || null,
    designationHi: str(form, "designationHi") || null,
    divisionId: Number(str(form, "divisionId", 10)) || null,
    phone: phoneOf(str(form, "phone", 30)),
    photoUrl: isOwnBlobUrl(photo) ? photo : null,
    sort: Number(str(form, "sort", 6)) || 0,
  };
}

export async function addMember(form: FormData) {
  await requireAdmin([...roles]);
  const wing = wingOf(form);
  const v = values(form);
  if (!v.nameEn) redirect(`/admin/wings?wing=${wing}&error=name`);
  await getDb().insert(schema.committeeMembers).values({ ...v, wing });
  updateTag("committee");
  redirect(`/admin/wings?wing=${wing}&saved=1`);
}

export async function saveMember(form: FormData) {
  await requireAdmin([...roles]);
  const wing = wingOf(form);
  const id = Number(form.get("id"));
  const v = values(form);
  if (!id || !v.nameEn) redirect(`/admin/wings?wing=${wing}&error=name`);
  const db = getDb();
  const [before] = await db.select({ photoUrl: schema.committeeMembers.photoUrl }).from(schema.committeeMembers).where(eq(schema.committeeMembers.id, id)).limit(1);
  await db.update(schema.committeeMembers).set({ ...v, active: form.get("active") === "on" }).where(eq(schema.committeeMembers.id, id));
  if (before?.photoUrl && before.photoUrl !== v.photoUrl) await deleteBlobs([before.photoUrl]);
  updateTag("committee");
  redirect(`/admin/wings?wing=${wing}&saved=1`);
}

export async function deleteMember(form: FormData) {
  await requireAdmin([...roles]);
  const wing = wingOf(form);
  const id = Number(form.get("id"));
  if (id) {
    const [row] = await getDb().delete(schema.committeeMembers).where(eq(schema.committeeMembers.id, id)).returning({ photoUrl: schema.committeeMembers.photoUrl });
    await deleteBlobs([row?.photoUrl]);
    updateTag("committee");
  }
  redirect(`/admin/wings?wing=${wing}&deleted=1`);
}
