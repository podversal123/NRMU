"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { getDb, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { deleteBlobs, isOwnBlobUrl } from "@/lib/blob";

const str = (f: FormData, k: string, max = 300) => String(f.get(k) ?? "").trim().slice(0, max);
const num = (f: FormData, k: string) => Number(str(f, k, 10)) || null;
const roles = ["super_admin", "editor"] as const;
const date = (v: string) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);

/** An album that does not exist must not be attached to a photo. */
async function albumOrNull(id: number | null) {
  if (!id) return null;
  const [a] = await getDb().select({ id: schema.galleryAlbums.id }).from(schema.galleryAlbums).where(eq(schema.galleryAlbums.id, id)).limit(1);
  return a?.id ?? null;
}

export async function addPhotos(form: FormData) {
  await requireAdmin([...roles]);
  const urls = form.getAll("photos").map(String).filter(isOwnBlobUrl);
  if (!urls.length) redirect("/admin/gallery?error=none");
  const caption = str(form, "captionEn");
  const captionHi = str(form, "captionHi");
  const takenOn = date(str(form, "takenOn", 10));
  const albumId = await albumOrNull(num(form, "albumId"));
  await getDb()
    .insert(schema.galleryPhotos)
    .values(urls.map((url) => ({ url, captionEn: caption, captionHi: captionHi || null, takenOn, albumId })));
  updateTag("gallery");
  redirect("/admin/gallery?saved=1");
}

export async function updatePhoto(form: FormData) {
  await requireAdmin([...roles]);
  const id = Number(form.get("id"));
  if (id) {
    await getDb()
      .update(schema.galleryPhotos)
      .set({
        captionEn: str(form, "captionEn"),
        captionHi: str(form, "captionHi") || null,
        takenOn: date(str(form, "takenOn", 10)),
        albumId: await albumOrNull(num(form, "albumId")),
        featured: form.get("featured") === "on",
        active: form.get("active") === "on",
        sort: Number(str(form, "sort", 6)) || 0,
      })
      .where(eq(schema.galleryPhotos.id, id));
    updateTag("gallery");
  }
  redirect("/admin/gallery?saved=1");
}

export async function deletePhoto(form: FormData) {
  await requireAdmin([...roles]);
  const id = Number(form.get("id"));
  if (id) {
    const [row] = await getDb().delete(schema.galleryPhotos).where(eq(schema.galleryPhotos.id, id)).returning({ url: schema.galleryPhotos.url });
    await deleteBlobs([row?.url]);
    updateTag("gallery");
  }
  redirect("/admin/gallery?deleted=1");
}

/** A branch already says which division it is in, so only one of the two is stored. */
function albumValues(form: FormData) {
  const branchId = num(form, "branchId");
  return {
    titleEn: str(form, "titleEn"),
    titleHi: str(form, "titleHi") || null,
    descriptionEn: str(form, "descriptionEn", 2000) || null,
    descriptionHi: str(form, "descriptionHi", 2000) || null,
    branchId,
    divisionId: branchId ? null : num(form, "divisionId"),
    heldOn: date(str(form, "heldOn", 10)),
    sort: Number(str(form, "sort", 6)) || 0,
    active: form.get("active") === "on",
  };
}

export async function createAlbum(form: FormData) {
  await requireAdmin([...roles]);
  const v = albumValues(form);
  if (!v.titleEn) redirect("/admin/gallery?error=title");
  const [row] = await getDb().insert(schema.galleryAlbums).values({ ...v, active: true }).returning({ id: schema.galleryAlbums.id });
  updateTag("gallery");
  redirect(`/admin/gallery?album=${row.id}#album-${row.id}`);
}

export async function updateAlbum(form: FormData) {
  await requireAdmin([...roles]);
  const id = Number(form.get("id"));
  const v = albumValues(form);
  if (!id) redirect("/admin/gallery");
  if (!v.titleEn) redirect("/admin/gallery?error=title");
  await getDb().update(schema.galleryAlbums).set(v).where(eq(schema.galleryAlbums.id, id));
  updateTag("gallery");
  redirect(`/admin/gallery?saved=1#album-${id}`);
}

/** Deleting an album keeps its photos; they become loose photographs. */
export async function deleteAlbum(form: FormData) {
  await requireAdmin([...roles]);
  const id = Number(form.get("id"));
  if (id) {
    await getDb().delete(schema.galleryAlbums).where(eq(schema.galleryAlbums.id, id));
    updateTag("gallery");
  }
  redirect("/admin/gallery?albumdeleted=1");
}
