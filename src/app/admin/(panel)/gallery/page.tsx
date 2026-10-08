import { asc, desc } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import UploadField from "../../UploadField";
import { DeleteButton, SubmitButton } from "../../SubmitButton";
import { Card, Field, Notice, PageTitle, inputCls } from "../../ui";
import { addPhotos, deletePhoto, updatePhoto } from "./actions";

// Always depends on the signed-in admin, so it is rendered per request.
export const instant = false;
export const metadata = { title: "Photo gallery" };
const small = "w-full border-2 border-line bg-white px-2.5 py-1.5 text-sm focus:border-ink focus:outline-none";

export default async function GalleryAdmin({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin(["super_admin", "editor"]);
  const sp = await searchParams;
  const photos = await getDb().select().from(schema.galleryPhotos).orderBy(asc(schema.galleryPhotos.sort), desc(schema.galleryPhotos.takenOn), desc(schema.galleryPhotos.id));

  return (
    <>
      <PageTitle title="Photo gallery" sub="Photographs of rallies, meetings and programmes. Featured photos appear first on the home page." />
      {sp.saved && <Notice>Saved. The public website is updated.</Notice>}
      {sp.deleted && <Notice>Photo deleted.</Notice>}
      {sp.error && <Notice kind="err">Choose at least one photo first.</Notice>}

      <Card>
        <h2 className="font-display text-2xl font-bold">Add photos</h2>
        <form action={addPhotos} className="mt-5 grid gap-5 lg:grid-cols-2">
          <div className="lg:col-span-2"><UploadField name="photos" label="Photos (you can select many at once)" kind="image" multiple folder="gallery" /></div>
          <Field label="Caption (English)" hint="Applied to all photos selected above. You can edit each one later."><input name="captionEn" className={inputCls} /></Field>
          <Field label="Caption (Hindi)"><input name="captionHi" className={inputCls} /></Field>
          <Field label="Date of event"><input type="date" name="takenOn" className={inputCls} /></Field>
          <div className="flex items-end"><SubmitButton>Add to gallery</SubmitButton></div>
        </form>
      </Card>

      <h2 className="mb-4 mt-10 font-display text-2xl font-bold">All photos ({photos.length})</h2>
      {photos.length === 0 && <p className="text-muted">No photos yet. Add the first ones above.</p>}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {photos.map((p) => (
          <div key={p.id} className="border border-line bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url} alt="" loading="lazy" className="aspect-[4/3] w-full bg-paper object-cover" />
            <form action={updatePhoto} className="space-y-2.5 p-4">
              <input type="hidden" name="id" value={p.id} />
              <input name="captionEn" defaultValue={p.captionEn} placeholder="Caption (English)" className={small} />
              <input name="captionHi" defaultValue={p.captionHi ?? ""} placeholder="कैप्शन (हिंदी)" className={small} />
              <div className="grid grid-cols-[1fr_5rem] gap-2">
                <input type="date" name="takenOn" defaultValue={p.takenOn ?? ""} className={small} />
                <input type="number" name="sort" defaultValue={p.sort} className={small} aria-label="Order" />
              </div>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-semibold">
                <label className="flex items-center gap-2"><input type="checkbox" name="featured" defaultChecked={p.featured} className="h-4 w-4" /> Feature on home</label>
                <label className="flex items-center gap-2"><input type="checkbox" name="active" defaultChecked={p.active} className="h-4 w-4" /> Show</label>
              </div>
              <SubmitButton className="rounded-full bg-ink px-5 py-1.5 text-sm font-semibold text-light hover:bg-brand">Save</SubmitButton>
            </form>
            <form action={deletePhoto} className="border-t border-line px-4 py-3">
              <input type="hidden" name="id" value={p.id} />
              <DeleteButton label="Delete photo" confirmText="Delete this photo permanently?" />
            </form>
          </div>
        ))}
      </div>
    </>
  );
}
