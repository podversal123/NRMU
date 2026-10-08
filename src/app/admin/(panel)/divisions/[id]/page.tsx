import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { DeleteButton, SubmitButton } from "../../../SubmitButton";
import { Card, Field, Notice, PageTitle, inputCls } from "../../../ui";
import { addBranch, deleteBranch, saveDivision } from "../actions";

// Always depends on the signed-in admin, so it is rendered per request.
export const instant = false;
export const metadata = { title: "Edit division" };

export default async function EditDivision({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin(["super_admin", "editor"]);
  const { id } = await params;
  const sp = await searchParams;
  const isNew = id === "new";
  if (!isNew && !/^\d+$/.test(id)) notFound();
  const db = getDb();
  const [d] = isNew ? [] : await db.select().from(schema.divisions).where(eq(schema.divisions.id, Number(id))).limit(1);
  if (!isNew && !d) notFound();
  const branches = isNew ? [] : await db.select().from(schema.branches).where(eq(schema.branches.divisionId, Number(id))).orderBy(asc(schema.branches.sort));

  return (
    <>
      <PageTitle title={isNew ? "Add division" : d.nameEn} action={<Link href="/admin/divisions" className="text-sm font-semibold text-brand">← All divisions</Link>} />
      {sp.saved && <Notice>Saved. The public website is updated.</Notice>}
      {sp.error && <Notice kind="err">Division name is required.</Notice>}
      <form action={saveDivision} className="grid gap-6 xl:grid-cols-[1fr_20rem]">
        <input type="hidden" name="id" value={isNew ? "" : id} />
        <Card className="grid gap-5 sm:grid-cols-2">
          <Field label="Name (English)"><input name="nameEn" required defaultValue={d?.nameEn} className={inputCls} /></Field>
          <Field label="Name (Hindi)"><input name="nameHi" defaultValue={d?.nameHi ?? ""} className={inputCls} /></Field>
          <Field label="Description (English)" hint="Optional, shown under the division title."><textarea name="descriptionEn" rows={3} defaultValue={d?.descriptionEn ?? ""} className={inputCls} /></Field>
          <Field label="Description (Hindi)"><textarea name="descriptionHi" rows={3} defaultValue={d?.descriptionHi ?? ""} className={inputCls} /></Field>
        </Card>
        <Card className="space-y-5">
          <Field label="Display order" hint="Smaller numbers show first."><input type="number" name="sort" defaultValue={d?.sort ?? 0} className={inputCls} /></Field>
          <label className="flex items-center gap-3 text-sm font-semibold"><input type="checkbox" name="active" defaultChecked={d?.active ?? true} className="h-5 w-5" /> Show on website</label>
          <SubmitButton className="btn-primary w-full px-6 py-3">Save</SubmitButton>
        </Card>
      </form>

      {!isNew && (
        <Card className="mt-8">
          <h2 className="font-display text-2xl font-bold">Branches ({branches.length})</h2>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {branches.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2">
                <span className="font-medium">{b.nameEn}</span>
                <form action={deleteBranch}>
                  <input type="hidden" name="id" value={b.id} />
                  <input type="hidden" name="divisionId" value={id} />
                  <DeleteButton label="Remove" confirmText={`Remove branch “${b.nameEn}”?`} />
                </form>
              </li>
            ))}
          </ul>
          <form action={addBranch} className="mt-6 max-w-xl space-y-3">
            <input type="hidden" name="divisionId" value={id} />
            <Field label="Add branches" hint="One per line (or comma separated)."><textarea name="names" rows={3} className={inputCls} /></Field>
            <SubmitButton className="rounded-full border-2 border-ink px-5 py-2 font-semibold hover:bg-ink hover:text-white">Add</SubmitButton>
          </form>
        </Card>
      )}
    </>
  );
}
