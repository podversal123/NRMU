"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { del } from "@vercel/blob";
import { getDb, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";

const str = (f: FormData, k: string, max = 300) => String(f.get(k) ?? "").trim().slice(0, max);
const roles = ["super_admin", "editor"] as const;
const date = (v: string) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);

export async function addPhotos(form: FormData) {
  await requireAdmin([...roles]);
  const urls = form.getAll("photos").map(String).filter((u) => /^https:\/\//.test(u));
  if (!urls.length) redirect("/admin/gallery?error=none");
  const caption = str(form, "captionEn");
  const captionHi = str(form, "captionHi");
  const takenOn = date(str(form, "takenOn", 10));
  await getDb()
    .insert(schema.galleryPhotos)
    .values(urls.map((url) => ({ url, captionEn: caption, captionHi: captionHi || null, takenOn })));
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
    if (row?.url.includes("blob.vercel-storage.com")) {
      try {
        await del(row.url);
      } catch {}
    }
    updateTag("gallery");
  }
  redirect("/admin/gallery?deleted=1");
}
