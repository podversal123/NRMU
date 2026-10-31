"use server";

import { eq, sql } from "drizzle-orm";
import { updateTag } from "next/cache";
import { getDb, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { deleteReel, isReelId, REEL_MAX_MB, REEL_MAX_SECONDS, reelInfo } from "@/lib/cloudinary";

const guard = () => requireAdmin(["super_admin", "editor"]);
const clean = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

export type SaveReelResult = { ok: true } | { ok: false; error: string };

/**
 * Called after the browser has uploaded a video to Cloudinary. We ask Cloudinary what it really holds before we keep
 * it: a name from another folder, a video that is too long or too big is refused (and removed again).
 */
export async function saveReel(input: { publicId: string; titleEn: string; titleHi: string; credit: string }): Promise<SaveReelResult> {
  const admin = await guard();
  const publicId = clean(input.publicId, 200);
  const titleEn = clean(input.titleEn, 200);
  if (!isReelId(publicId)) return { ok: false, error: "That video does not belong to the reels folder." };
  if (titleEn.length < 3) return { ok: false, error: "Please write a title of at least 3 characters." };

  // Cloudinary may need a moment before it knows the length of a fresh upload; ask again before judging it.
  let info = await reelInfo(publicId);
  for (let tries = 0; info && info.seconds === 0 && tries < 4; tries++) {
    await new Promise((r) => setTimeout(r, 1500));
    info = await reelInfo(publicId);
  }
  if (!info) return { ok: false, error: "The video could not be found at the video store. Please upload it again." };
  if (info.seconds > REEL_MAX_SECONDS || info.bytes > REEL_MAX_MB * 1024 * 1024) {
    await deleteReel(publicId);
    return { ok: false, error: `A reel can be at most ${REEL_MAX_SECONDS} seconds and ${REEL_MAX_MB} MB. This one was ${info.seconds} seconds and ${(info.bytes / 1048576).toFixed(0)} MB, so it was not kept.` };
  }

  const db = getDb();
  const [{ next }] = (await db.execute(sql`select coalesce(max(sort), 0) + 1 as next from reels`)).rows as { next: number }[];
  await db
    .insert(schema.reels)
    .values({ titleEn, titleHi: clean(input.titleHi, 200) || null, credit: clean(input.credit, 200) || null, publicId, seconds: info.seconds, bytes: info.bytes, sort: Number(next), createdBy: admin.id })
    .onConflictDoNothing({ target: schema.reels.publicId });
  updateTag("reels");
  return { ok: true };
}

export async function setReelPublished(form: FormData) {
  await guard();
  const id = Number(form.get("id"));
  if (id) await getDb().update(schema.reels).set({ published: form.get("published") === "1" }).where(eq(schema.reels.id, id));
  updateTag("reels");
}

/** Removes the reel and its video at Cloudinary (the free space is limited, so unused videos should not stay). */
export async function removeReel(form: FormData) {
  await guard();
  const id = Number(form.get("id"));
  if (!id) return;
  const [r] = await getDb().delete(schema.reels).where(eq(schema.reels.id, id)).returning({ publicId: schema.reels.publicId });
  if (r) await deleteReel(r.publicId);
  updateTag("reels");
}
