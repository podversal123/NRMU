import { asc, desc } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { cloudinaryConfigured, REEL_MAX_MB, REEL_MAX_SECONDS, reelUrls } from "@/lib/cloudinary";
import { DeleteButton, SubmitButton } from "../../SubmitButton";
import { Card, Notice, PageTitle } from "../../ui";
import { removeReel, setReelPublished } from "./actions";
import ReelUploader from "./ReelUploader";

// Always depends on the signed-in admin, so it is rendered per request.
export const instant = false;
export const metadata = { title: "Reels" };

export default async function ReelsAdmin() {
  await requireAdmin(["super_admin", "editor"]);
  const reels = await getDb().select().from(schema.reels).orderBy(asc(schema.reels.sort), desc(schema.reels.id));
  const ready = cloudinaryConfigured();

  return (
    <>
      <PageTitle title="Reels" sub="Short railway videos shown on the Reels page of the website. They play from Cloudinary." />
      {!ready && <Notice kind="err">The video store (Cloudinary) is not set up on this site, so videos cannot be added yet.</Notice>}
      {ready && (
        <Card className="mb-8">
          <h2 className="font-display text-2xl font-bold">Add a reel</h2>
          <p className="mb-5 mt-1 text-sm text-muted">Upload a video, give it a title, and it appears on the Reels page at once. A vertical (phone-shaped) video looks best.</p>
          <ReelUploader maxMb={REEL_MAX_MB} maxSeconds={REEL_MAX_SECONDS} />
        </Card>
      )}
      {reels.length === 0 ? (
        <p className="text-muted">No reels yet.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {reels.map((r) => (
            <li key={r.id} className="flex gap-4 border border-line bg-white p-4">
              {/* eslint-disable-next-line @next/next/no-img-element -- a small still of the video, served by Cloudinary */}
              <img src={reelUrls(r.publicId, r.bytes).poster} alt="" width={90} height={160} className="h-40 w-[90px] shrink-0 rounded bg-black object-cover" />
              <div className="min-w-0 flex-1 space-y-2">
                <p className="font-semibold leading-snug">{r.titleEn}</p>
                <p className="text-xs text-muted">
                  {r.seconds} sec · {(r.bytes / 1048576).toFixed(1)} MB · {r.published ? "Shown" : "Hidden"}
                </p>
                {r.credit && <p className="text-xs text-muted">{r.credit}</p>}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <form action={setReelPublished}>
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="published" value={r.published ? "0" : "1"} />
                    <SubmitButton className="rounded-full border-2 border-ink px-4 py-1.5 text-sm font-semibold hover:bg-ink hover:text-white">{r.published ? "Hide" : "Show"}</SubmitButton>
                  </form>
                  <form action={removeReel}>
                    <input type="hidden" name="id" value={r.id} />
                    <DeleteButton label="Delete" confirmText="Delete this reel and its video permanently?" />
                  </form>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
