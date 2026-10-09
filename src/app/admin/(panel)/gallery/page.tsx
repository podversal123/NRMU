import { asc, desc, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import UploadField from "../../UploadField";
import { DeleteButton, SubmitButton } from "../../SubmitButton";
import { Card, Field, Notice, PageTitle, inputCls } from "../../ui";
import { addPhotos, createAlbum, deleteAlbum, deletePhoto, updateAlbum, updatePhoto } from "./actions";

// Always depends on the signed-in admin, so it is rendered per request.
export const instant = false;
export const metadata = { title: "Photo gallery" };
const small = "w-full border-2 border-line bg-white px-2.5 py-2.5 text-base focus:border-ink lg:py-1.5 lg:text-sm focus:outline-none";

export default async function GalleryAdmin({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin(["super_admin", "editor"]);
  const sp = await searchParams;
  const db = getDb();
  const [photos, albums, divisions, branches, counts] = await Promise.all([
    db.select().from(schema.galleryPhotos).orderBy(asc(schema.galleryPhotos.sort), desc(schema.galleryPhotos.takenOn), desc(schema.galleryPhotos.id)),
    db.select().from(schema.galleryAlbums).orderBy(asc(schema.galleryAlbums.sort), desc(schema.galleryAlbums.heldOn), desc(schema.galleryAlbums.id)),
    db.select().from(schema.divisions).orderBy(asc(schema.divisions.sort)),
    db.select().from(schema.branches).orderBy(asc(schema.branches.divisionId), asc(schema.branches.sort)),
    db.execute(sql`select album_id as id, count(*)::int as n from gallery_photos where album_id is not null group by album_id`),
  ]);
  const photoCount = new Map((counts.rows as { id: number; n: number }[]).map((r) => [r.id, r.n]));

  const albumSelect = (name: string, value: number | null) => (
    <select name={name} defaultValue={value ?? ""} className={small} aria-label="Album">
      <option value="">No album</option>
      {albums.map((a) => <option key={a.id} value={a.id}>{a.titleEn}</option>)}
    </select>
  );
  const placeFields = (a?: (typeof albums)[number]) => (
    <>
      <Field label="Division" hint="Leave empty for the whole union.">
        <select name="divisionId" defaultValue={a?.divisionId ?? ""} className={inputCls}>
          <option value="">Whole union</option>
          {divisions.map((d) => <option key={d.id} value={d.id}>{d.nameEn}</option>)}
        </select>
      </Field>
      <Field label="Branch" hint="Choose a branch only if the album belongs to one branch. Its division is then taken from it.">
        <select name="branchId" defaultValue={a?.branchId ?? ""} className={inputCls}>
          <option value="">Not for one branch</option>
          {divisions.map((d) => (
            <optgroup key={d.id} label={d.nameEn}>
              {branches.filter((b) => b.divisionId === d.id).map((b) => <option key={b.id} value={b.id}>{b.nameEn}</option>)}
            </optgroup>
          ))}
        </select>
      </Field>
    </>
  );

  return (
    <>
      <PageTitle title="Photo gallery" sub="Albums of rallies, meetings and programmes, tagged with their division or branch so visitors can filter them. Featured photos appear first on the home page." />
      {sp.saved && <Notice>Saved. The public website is updated.</Notice>}
      {sp.deleted && <Notice>Photo deleted.</Notice>}
      {sp.albumdeleted && <Notice>Album deleted. Its photos are kept as loose photographs.</Notice>}
      {sp.album && <Notice>Album created. Now add photos to it below.</Notice>}
      {sp.error === "none" && <Notice kind="err">Choose at least one photo first.</Notice>}
      {sp.error === "title" && <Notice kind="err">An album needs a title in English.</Notice>}

      <h2 className="mb-4 font-display text-2xl font-bold">Albums ({albums.length})</h2>
      <Card>
        <h3 className="font-display text-xl font-bold">New album</h3>
        <form action={createAlbum} className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Field label="Title (English)"><input name="titleEn" required className={inputCls} /></Field>
          <Field label="Title (Hindi)"><input name="titleHi" className={inputCls} /></Field>
          {placeFields()}
          <Field label="Date of the event"><input type="date" name="heldOn" className={inputCls} /></Field>
          <Field label="Description (English)" hint="Optional."><textarea name="descriptionEn" rows={2} className={inputCls} /></Field>
          <Field label="Description (Hindi)"><textarea name="descriptionHi" rows={2} className={inputCls} /></Field>
          <div className="lg:col-span-2"><SubmitButton>Create album</SubmitButton></div>
        </form>
      </Card>
      <div className="mt-5 space-y-5">
        {albums.map((a) => (
          <Card key={a.id}>
            <div id={`album-${a.id}`} className="scroll-mt-24" />
            <form action={updateAlbum} className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <input type="hidden" name="id" value={a.id} />
              <h3 className="font-display text-xl font-bold lg:col-span-2">{a.titleEn} <span className="text-base font-normal text-muted">({photoCount.get(a.id) ?? 0} photos)</span></h3>
              <Field label="Title (English)"><input name="titleEn" required defaultValue={a.titleEn} className={inputCls} /></Field>
              <Field label="Title (Hindi)"><input name="titleHi" defaultValue={a.titleHi ?? ""} className={inputCls} /></Field>
              {placeFields(a)}
              <Field label="Date of the event"><input type="date" name="heldOn" defaultValue={a.heldOn ?? ""} className={inputCls} /></Field>
              <Field label="Order" hint="Smaller numbers come first."><input type="number" name="sort" defaultValue={a.sort} className={inputCls} /></Field>
              <Field label="Description (English)"><textarea name="descriptionEn" rows={2} defaultValue={a.descriptionEn ?? ""} className={inputCls} /></Field>
              <Field label="Description (Hindi)"><textarea name="descriptionHi" rows={2} defaultValue={a.descriptionHi ?? ""} className={inputCls} /></Field>
              <label className="flex items-center gap-3 font-semibold lg:col-span-2"><input type="checkbox" name="active" defaultChecked={a.active} className="h-6 w-6" /> Show this album on the website</label>
              <div className="lg:col-span-2"><SubmitButton>Save album</SubmitButton></div>
            </form>
            <form action={deleteAlbum} className="mt-4 border-t border-line pt-4">
              <input type="hidden" name="id" value={a.id} />
              <DeleteButton label="Delete album (photos are kept)" confirmText="Delete this album? Its photos stay in the gallery as loose photographs." />
            </form>
          </Card>
        ))}
      </div>

      <h2 className="mb-4 mt-12 font-display text-2xl font-bold">Add photos</h2>
      <Card>
        <form action={addPhotos} className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="lg:col-span-2"><UploadField name="photos" label="Photos (you can select many at once)" kind="image" multiple folder="gallery" /></div>
          <Field label="Put them in this album"><div>{albumSelect("albumId", null)}</div></Field>
          <Field label="Date of event"><input type="date" name="takenOn" className={inputCls} /></Field>
          <Field label="Caption (English)" hint="Applied to all photos selected above. You can edit each one later."><input name="captionEn" className={inputCls} /></Field>
          <Field label="Caption (Hindi)"><input name="captionHi" className={inputCls} /></Field>
          <div className="lg:col-span-2"><SubmitButton>Add to gallery</SubmitButton></div>
        </form>
      </Card>

      <h2 className="mb-4 mt-12 font-display text-2xl font-bold">All photos ({photos.length})</h2>
      {photos.length === 0 && <p className="text-muted">No photos yet. Add the first ones above.</p>}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {photos.map((p) => (
          <div key={p.id} className="border border-line bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url} alt="" loading="lazy" className="aspect-[4/3] w-full bg-paper object-cover" />
            <form action={updatePhoto} className="space-y-2.5 p-4">
              <input type="hidden" name="id" value={p.id} />
              <input name="captionEn" defaultValue={p.captionEn} placeholder="Caption (English)" className={small} />
              <input name="captionHi" defaultValue={p.captionHi ?? ""} placeholder="कैप्शन (हिंदी)" className={small} />
              {albumSelect("albumId", p.albumId)}
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
