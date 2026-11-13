import "server-only";
import { createHash } from "node:crypto";

/**
 * Cloudinary, where the reels are kept. Three settings are needed (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY,
 * CLOUDINARY_API_SECRET). The secret never leaves the server: the browser gets a one-off signature to upload one file.
 */
const cfg = () => ({ cloud: process.env.CLOUDINARY_CLOUD_NAME ?? "", key: process.env.CLOUDINARY_API_KEY ?? "", secret: process.env.CLOUDINARY_API_SECRET ?? "" });
export const cloudinaryConfigured = () => {
  const c = cfg();
  return Boolean(c.cloud && c.key && c.secret);
};

/** All reels live under this folder, so a name from anywhere else is never accepted. */
export const REEL_FOLDER = "nrmu/reels";
export const REEL_MAX_SECONDS = 90;
export const REEL_MAX_MB = 100;

/** Cloudinary's signature: the sorted parameters joined as a=1&b=2, with the secret added, hashed with SHA-1. */
const sign = (params: Record<string, string>) =>
  createHash("sha1")
    .update(
      Object.keys(params)
        .sort()
        .map((k) => `${k}=${params[k]}`)
        .join("&") + cfg().secret,
    )
    .digest("hex");

/** What the browser needs to upload ONE video into the reels folder. Valid for a few minutes. */
export function signReelUpload() {
  const c = cfg();
  const params = { allowed_formats: "mp4,mov,webm,m4v", folder: REEL_FOLDER, timestamp: String(Math.floor(Date.now() / 1000)) };
  return { cloud: c.cloud, apiKey: c.key, ...params, signature: sign(params) };
}

export const isReelId = (id: string) => id.startsWith(`${REEL_FOLDER}/`) && /^[\w\-/.]{5,200}$/.test(id) && !id.includes("..");

const auth = () => `Basic ${Buffer.from(`${cfg().key}:${cfg().secret}`).toString("base64")}`;

/** Asks Cloudinary what it really holds under this name (the browser's own numbers are never trusted). */
export async function reelInfo(publicId: string): Promise<{ seconds: number; bytes: number } | null> {
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cfg().cloud}/resources/video/upload/${publicId.split("/").map(encodeURIComponent).join("/")}`, {
    headers: { Authorization: auth() },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) return null;
  const j = (await res.json()) as { duration?: number; bytes?: number };
  return { seconds: Math.round(j.duration ?? 0), bytes: j.bytes ?? 0 };
}

/** Removes a video from Cloudinary. Quietly does nothing when it is already gone. */
export async function deleteReel(publicId: string) {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const body = new URLSearchParams({ public_id: publicId, timestamp, api_key: cfg().key, signature: sign({ public_id: publicId, timestamp }), invalidate: "true" });
  await fetch(`https://api.cloudinary.com/v1_1/${cfg().cloud}/video/destroy`, { method: "POST", body, signal: AbortSignal.timeout(10000) }).catch(() => {});
}

/**
 * Where a reel is played from, and a still picture of its first second. A small video is played as uploaded (a
 * re-compressed copy of an already small file is no smaller, and the first request has to wait for Cloudinary to make it);
 * a big one is played from a compressed copy that Cloudinary chooses for the viewer.
 */
const COMPRESS_ABOVE_BYTES = 12 * 1024 * 1024;
export const reelUrls = (publicId: string, bytes = 0) => {
  const base = `https://res.cloudinary.com/${cfg().cloud}/video/upload`;
  return { video: `${base}${bytes > COMPRESS_ABOVE_BYTES ? "/q_auto" : ""}/${publicId}.mp4`, poster: `${base}/so_1,w_720,q_auto/${publicId}.jpg` };
};
