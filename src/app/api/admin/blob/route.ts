import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { del, head } from "@vercel/blob";
import { getAdmin } from "@/lib/auth";
import { isOwnBlobUrl } from "@/lib/blob";
import { MAX_UPLOAD_MB } from "@/lib/upload-types";

const ALLOWED = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

/** A file can only be taken back by the form that just uploaded it, not weeks later. */
const UNDO_WINDOW_MS = 2 * 60 * 60 * 1000;

/** Issues short-lived upload tokens, only to signed-in admins. Files go straight from the browser to Blob. */
export async function POST(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ALLOWED,
        maximumSizeInBytes: MAX_UPLOAD_MB * 1024 * 1024,
        addRandomSuffix: true,
        tokenPayload: JSON.stringify({ adminId: admin.id }),
      }),
    });
    return NextResponse.json(json);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Upload failed" }, { status: 400 });
  }
}

/** Removes a file the admin has just uploaded and then taken out of the form without saving. */
export async function DELETE(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let url: unknown;
  try {
    ({ url } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (typeof url !== "string" || !isOwnBlobUrl(url)) return NextResponse.json({ error: "Invalid file" }, { status: 400 });

  try {
    const meta = await head(url);
    if (Date.now() - meta.uploadedAt.getTime() > UNDO_WINDOW_MS) return NextResponse.json({ error: "Too old to remove here" }, { status: 403 });
    await del(url);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Could not remove the file" }, { status: 404 });
  }
}
