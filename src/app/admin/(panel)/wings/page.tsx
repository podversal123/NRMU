import Link from "next/link";
import { asc } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import UploadField from "../../UploadField";
import { DeleteButton, SubmitButton } from "../../SubmitButton";
import { Card, Field, Notice, PageTitle, inputCls } from "../../ui";
import { addMember, deleteMember, saveMember } from "./actions";

// Always depends on the signed-in admin, so it is rendered per request.
export const instant = false;
export const metadata = { title: "Women & Youth wings" };

const WINGS = [
  { key: "women", label: "Women Wing" },
  { key: "youth", label: "Youth NRMU" },
] as const;

export default async function WingsAdmin({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin(["super_admin", "editor"]);
  const sp = await searchParams;
  const wing = WINGS.find((w) => w.key === sp.wing) ?? WINGS[0];
  const db = getDb();
  const [all, divisions] = await Promise.all([
    db.select().from(schema.committeeMembers).orderBy(asc(schema.committeeMembers.sort), asc(schema.committeeMembers.id)),
    db.select().from(schema.divisions).orderBy(asc(schema.divisions.sort)),
  ]);
  const rows = all.filter((r) => r.wing === wing.key);

  const fields = (r?: (typeof rows)[number]) => (
    <>
      <Field label="Name (English)"><input name="nameEn" required defaultValue={r?.nameEn} className={inputCls} /></Field>
      <Field label="Name (Hindi)"><input name="nameHi" defaultValue={r?.nameHi ?? ""} className={inputCls} /></Field>
      <Field label="Post (English)" hint="For example President, Secretary, Member."><input name="designationEn" defaultValue={r?.designationEn ?? ""} className={inputCls} /></Field>
      <Field label="Post (Hindi)"><input name="designationHi" defaultValue={r?.designationHi ?? ""} className={inputCls} /></Field>
      <Field label="Division" hint="Leave on Central for a member of the central committee.">
        <select name="divisionId" defaultValue={r?.divisionId ?? ""} className={inputCls}>
          <option value="">Central</option>
          {divisions.map((d) => <option key={d.id} value={d.id}>{d.nameEn}</option>)}
        </select>
      </Field>
      <Field label="Mobile"><input name="phone" inputMode="tel" defaultValue={r?.phone ?? ""} className={inputCls} /></Field>
      <Field label="Order" hint="Smaller numbers come first."><input type="number" name="sort" defaultValue={r?.sort ?? 0} className={inputCls} /></Field>
      <div className="lg:col-span-2"><UploadField name="photo" label="Photo (optional)" kind="image" folder="wings" initial={r?.photoUrl ? [r.photoUrl] : []} /></div>
    </>
  );

  return (
    <>
      <PageTitle title="Women & Youth wings" sub="The committee of each wing, shown on its page. Reports and updates of a wing are posted as news under Orders & news." />
      {sp.saved && <Notice>Saved. The public website is updated.</Notice>}
      {sp.deleted && <Notice>Removed.</Notice>}
      {sp.error && <Notice kind="err">A name is needed.</Notice>}

      <nav aria-label="Wing" className="mb-6 flex flex-wrap gap-2">
        {WINGS.map((w) => (
          <Link key={w.key} href={`/admin/wings?wing=${w.key}`} aria-current={w.key === wing.key ? "page" : undefined} className={`inline-flex min-h-11 items-center border-2 px-5 font-semibold ${w.key === wing.key ? "border-ink bg-ink text-light" : "border-line bg-white hover:border-ink"}`}>
            {w.label}
          </Link>
        ))}
      </nav>

      <Card>
        <h2 className="font-display text-2xl font-bold">Add a member of the {wing.label} committee</h2>
        <form action={addMember} className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <input type="hidden" name="wing" value={wing.key} />
          {fields()}
          <div className="lg:col-span-2"><SubmitButton>Add to committee</SubmitButton></div>
        </form>
      </Card>

      <h2 className="mb-4 mt-10 font-display text-2xl font-bold">Committee ({rows.length})</h2>
      {rows.length === 0 && <p className="text-muted">Nobody is listed yet. The public page says the list will be added soon.</p>}
      <div className="space-y-5">
        {rows.map((r) => (
          <Card key={r.id}>
            <form action={saveMember} className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <input type="hidden" name="wing" value={wing.key} />
              <input type="hidden" name="id" value={r.id} />
              {fields(r)}
              <label className="flex items-center gap-3 font-semibold lg:col-span-2"><input type="checkbox" name="active" defaultChecked={r.active} className="h-6 w-6" /> Show on the website</label>
              <div className="lg:col-span-2"><SubmitButton>Save</SubmitButton></div>
            </form>
            <form action={deleteMember} className="mt-4 border-t border-line pt-4">
              <input type="hidden" name="wing" value={wing.key} />
              <input type="hidden" name="id" value={r.id} />
              <DeleteButton label="Remove from committee" confirmText="Remove this person from the committee?" />
            </form>
          </Card>
        ))}
      </div>
    </>
  );
}
