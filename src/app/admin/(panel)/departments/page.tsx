import { asc, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { SubmitButton } from "../../SubmitButton";
import { Card, Notice, PageTitle, inputCls } from "../../ui";
import { addDepartment, saveDepartment } from "./actions";

// Always depends on the signed-in admin, so it is rendered per request.
export const instant = false;
export const metadata = { title: "Departments" };

export default async function DepartmentsAdmin({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  await requireAdmin(["super_admin"]);
  const sp = await searchParams;
  const db = getDb();
  const [rows, used] = await Promise.all([
    db.select().from(schema.departments).orderBy(asc(schema.departments.sort), asc(schema.departments.id)),
    db.execute(sql`select department_id as id, count(*)::int as n from members where department_id is not null group by department_id`),
  ]);
  const count = new Map(((((used as unknown as { rows?: { id: number; n: number }[] }).rows ?? used) as { id: number; n: number }[])).map((r) => [r.id, r.n]));
  const small = "w-full border-2 border-line bg-white px-2.5 py-2.5 text-base focus:border-ink focus:outline-none lg:py-1.5 lg:text-sm";

  return (
    <>
      <PageTitle title="Departments" sub="The fields members work in (commercial, loco, S&T...). Members pick one when they register, and reels and updates will follow it." />
      {sp.saved && <Notice>Saved.</Notice>}
      {sp.error && <Notice kind="err">A department needs a name.</Notice>}

      <Card>
        <h2 className="font-display text-2xl font-bold">Add a department</h2>
        <form action={addDepartment} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <input name="nameEn" required placeholder="Name (English)" aria-label="Name (English)" className={inputCls + " !mt-0"} />
          <input name="nameHi" placeholder="Name (Hindi)" aria-label="Name (Hindi)" className={inputCls + " !mt-0"} />
          <SubmitButton className="btn-primary px-6 py-2.5">Add</SubmitButton>
        </form>
      </Card>

      <div className="mt-8 space-y-3">
        {rows.map((d) => (
          <form key={d.id} action={saveDepartment} className="grid grid-cols-1 items-center gap-3 border border-line bg-white p-4 lg:grid-cols-[1fr_1fr_5rem_auto_auto_auto]">
            <input type="hidden" name="id" value={d.id} />
            <input name="nameEn" required defaultValue={d.nameEn} aria-label="Name (English)" className={small} />
            <input name="nameHi" defaultValue={d.nameHi ?? ""} aria-label="Name (Hindi)" className={small} />
            <input name="sort" type="number" defaultValue={d.sort} aria-label="Order" className={small} />
            <label className="flex min-h-11 items-center gap-2 text-sm font-semibold"><input type="checkbox" name="active" defaultChecked={d.active} className="h-6 w-6" /> Show</label>
            <span className="text-sm text-muted">{count.get(d.id) ?? 0} members</span>
            <SubmitButton className="rounded-full border-2 border-ink px-5 py-2 text-sm font-semibold hover:bg-ink hover:text-white">Save</SubmitButton>
          </form>
        ))}
      </div>
    </>
  );
}
