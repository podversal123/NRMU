import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/auth";
import { cloudinaryConfigured, signReelUpload } from "@/lib/cloudinary";
import { limited } from "@/lib/rate-limit";

/** Gives a signed-in admin a one-off signature to upload ONE video to the reels folder. Nobody else gets one. */
export async function POST() {
  const admin = await getAdmin();
  if (!admin || (admin.role !== "super_admin" && admin.role !== "editor")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!cloudinaryConfigured()) return NextResponse.json({ error: "Video storage is not set up" }, { status: 503 });
  if (await limited("reel-sign", { perAddress: 60, perSecret: { id: String(admin.id), max: 40 }, windowSeconds: 3600 })) return NextResponse.json({ error: "Too many uploads. Please wait." }, { status: 429 });
  return NextResponse.json(signReelUpload(), { headers: { "Cache-Control": "no-store" } });
}
