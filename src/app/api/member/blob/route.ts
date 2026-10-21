import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { del, head } from "@vercel/blob";
import { isOwnBlobUrl } from "@/lib/blob";
import { feedConfig } from "@/lib/feed";
import { blobPath, memberFolder } from "@/lib/feed-paths";
import { getMember } from "@/lib/member-auth";
import { tooMany } from "@/lib/rate-limit";
import { MEDIA_TYPES } from "@/lib/upload-types";

/** A file can only be taken back by the form that just uploaded it, not weeks later. */
const UNDO_WINDOW_MS = 2 * 60 * 60 * 1000;

/**
 * Issues short-lived upload tokens to signed-in members for feed photos and videos. Files go straight from the
 * browser to Blob storage. The size is checked again when the post is sent (feed actions), per photo or video.
 */
export async function POST(request: Request) {
  const member = await getMember();
  if (!member) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const cfg = await feedConfig();

  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith(memberFolder(member.id))) throw new Error("Wrong folder");
        // as many files a day as the daily posts could carry, twice over for files picked and then removed
        if (await tooMany("member-upload", `m${member.id}`, cfg.postsPerDay * Math.max(1, cfg.maxMedia) * 2, 86400)) throw new Error("Too many uploads today");
        return {
          allowedContentTypes: MEDIA_TYPES,
          maximumSizeInBytes: Math.max(cfg.maxImageMb, cfg.maxVideoMb) * 1024 * 1024,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ memberId: member.id }),
        };
      },
    });
    return NextResponse.json(json);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Upload failed" }, { status: 400 });
  }
}

/** Removes a file the member has just uploaded and then taken out of the post before sending it. */
export async function DELETE(request: Request) {
  const member = await getMember();
  if (!member) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let url: unknown;
  try {
    ({ url } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (typeof url !== "string" || !isOwnBlobUrl(url) || !blobPath(url).startsWith(memberFolder(member.id))) {
    return NextResponse.json({ error: "Invalid file" }, { status: 400 });
  }
  try {
    const meta = await head(url);
    if (Date.now() - meta.uploadedAt.getTime() > UNDO_WINDOW_MS) return NextResponse.json({ error: "Too old to remove here" }, { status: 403 });
    await del(url);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Could not remove the file" }, { status: 404 });
  }
}
