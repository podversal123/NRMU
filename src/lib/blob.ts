import "server-only";
import { del } from "@vercel/blob";

const OWN = /^https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\//i;

/** True only for files that live in this project's own Blob store. */
export const isOwnBlobUrl = (u: string) => OWN.test(u);

/** Removes files from the Blob store once nothing uses them. Other hosts (old site files) are left alone. */
export async function deleteBlobs(urls: (string | null | undefined)[]) {
  const own = [...new Set(urls.filter((u): u is string => !!u && OWN.test(u)))];
  if (!own.length) return;
  try {
    await del(own);
  } catch (e) {
    console.error("Blob cleanup failed", e);
  }
}
