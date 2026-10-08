import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import UploadField from "../../../UploadField";
import { DeleteButton, SubmitButton } from "../../../SubmitButton";
import { Card, Field, Notice, PageTitle, inputCls } from "../../../ui";
import { deleteOfficial, saveOfficial } from "../actions";

// Always depends on the signed-in admin, so it is rendered per request.
export const instant = false;
export const metadata = { title: "Edit office bearer" };

export default async function EditOfficial({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const isNew = id === "new";
  if (!isNew && !/^\d+$/.test(id)) notFound();
  const db = getDb();
  const [person] = isNew ? [] : await db.select().from(schema.officeBearers).where(
    admin.role === "division_admin" ? and(eq(schema.officeBearers.id, Number(id)), eq(schema.officeBearers.divisionId, admin.divisionId ?? -1)) : eq(schema.officeBearers.id, Number(id)),
  ).limit(1);
  if (!isNew && !person) notFound();
  const [divisions, designations, branches] = await Promise.all([
    db.select().from(schema.divisions).orderBy(asc(schema.divisions.sort)),
    db.select().from(schema.designations).orderBy(asc(schema.designations.scope), asc(schema.designations.sort)),
    db.select().from(schema.branches).orderBy(asc(schema.branches.divisionId), asc(schema.branches.sort)),
  ]);
  
  return (
    <>
      <PageTitle title={isNew ? "Add person" : person.nameEn} action={<Link href="/admin/officials" className="text-sm font-semibold text-brand">← All people</Link>} />
      {sp.saved && <Notice>Saved. The public website is updated.</Notice>}
      {sp.error && <Notice kind="err">Name and designation are required.</Notice>}
      <form action={saveOfficial} className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <input type="hidden" name="id" value={isNew ? "" : id} />
        <Card className="grid gap-5 sm:grid-cols-2">
          <Field label="Name (English)"><input name="nameEn" required defaultValue={person?.nameEn} className={inputCls} /></Field>
          <Field label="Name (Hindi)" hint="Optional"><input name="nameHi" defaultValue={person?.nameHi ?? ""} className={inputCls} /></Field>
          <Field label="Designation" hint="Titles are managed centrally, so spelling stays consistent.">
            <select name="designationId" required defaultValue={person?.designationId ?? ""} className={inputCls}>
              <option value="" disabled>Select a designation</option>
              {designations.filter((d) => admin.role !== "division_admin" || d.scope !== "central").map((d) => <option key={d.id} value={d.id}>{d.nameEn}</option>)}
            </select>
          </Field>
          <Field label="Place of work" hint="Shown next to the designation, e.g. the branch or depot."><input name="placeLabel" defaultValue={person?.placeLabel ?? ""} className={inputCls} /></Field>
          <Field label="Branch" hint="Optional. Link to a branch of the division.">
            <select name="branchId" defaultValue={person?.branchId ?? ""} className={inputCls}>
              <option value="">None</option>
              {divisions.map((d) => (
                <optgroup key={d.id} label={d.nameEn}>
                  {branches.filter((b) => b.divisionId === d.id).map((b) => <option key={b.id} value={b.id}>{b.nameEn}</option>)}
                </optgroup>
              ))}
            </select>
          </Field>
          <Field label="Address" className="sm:col-span-2"><textarea name="addressEn" rows={3} defaultValue={person?.addressEn ?? ""} className={inputCls} /></Field>
          <Field label="Phone"><input name="phone" defaultValue={person?.phone ?? ""} className={inputCls} /></Field>
          <div className="sm:col-span-2"><UploadField name="photo" label="Photo" kind="image" folder="officials" initial={person?.photoUrl ? [person.photoUrl] : []} /></div>
        </Card>
        <Card className="space-y-5">
          {admin.role !== "division_admin" && (
            <Field label="Division" hint="Leave empty for central office bearers.">
              <select name="divisionId" defaultValue={person?.divisionId ?? ""} className={inputCls}>
                <option value="">None</option>
                {divisions.map((d) => <option key={d.id} value={d.id}>{d.nameEn}</option>)}
              </select>
            </Field>
          )}
          <Field label="Display order" hint="Smaller numbers show first."><input type="number" name="sort" defaultValue={person?.sort ?? 0} className={inputCls} /></Field>
          <label className="flex items-center gap-3 text-sm font-semibold"><input type="checkbox" name="active" defaultChecked={person?.active ?? true} className="h-5 w-5" /> Show on website</label>
          {admin.role !== "division_admin" && (
            <label className="flex items-center gap-3 text-sm font-semibold"><input type="checkbox" name="featured" defaultChecked={person?.featured ?? false} className="h-5 w-5" /> Feature on home page</label>
          )}
          <SubmitButton className="btn-primary w-full px-6 py-3">Save</SubmitButton>
        </Card>
      </form>
      {!isNew && (
        <form action={deleteOfficial} className="mt-6">
          <input type="hidden" name="id" value={id} />
          <DeleteButton label="Delete this person" confirmText="Delete this person permanently?" />
        </form>
      )}
    </>
  );
}
