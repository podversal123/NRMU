import Link from "next/link";
import { and, asc, eq, ilike } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { LinkButton, Notice, PageTitle, inputCls, td, th } from "../../ui";

// Always depends on the signed-in admin, so it is rendered per request.
export const instant = false;
export const metadata = { title: "Office bearers" };
export const SCOPE_LABEL: Record<string, string> = {
  central: "Central",
  division_president: "Division president",
  division_secretary: "Division secretary",
  branch_secretary: "Branch secretary",
};

export default async function OfficialsAdmin({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const admin = await requireAdmin();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 100);
  const scope = sp.scope && SCOPE_LABEL[sp.scope] ? sp.scope : undefined;
  const db = getDb();
  const where = and(
    q ? ilike(schema.officeBearers.nameEn, `%${q}%`) : undefined,
    scope ? eq(schema.officeBearers.scope, scope) : undefined,
    admin.role === "division_admin" ? eq(schema.officeBearers.divisionId, admin.divisionId ?? -1) : undefined,
  );
  const rows = await db
    .select({ id: schema.officeBearers.id, name: schema.officeBearers.nameEn, designation: schema.designations.nameEn, scope: schema.officeBearers.scope, division: schema.divisions.nameEn, active: schema.officeBearers.active, featured: schema.officeBearers.featured })
    .from(schema.officeBearers)
    .leftJoin(schema.divisions, eq(schema.divisions.id, schema.officeBearers.divisionId))
    .leftJoin(schema.designations, eq(schema.designations.id, schema.officeBearers.designationId))
    .where(where)
    .orderBy(asc(schema.officeBearers.scope), asc(schema.officeBearers.sort), asc(schema.officeBearers.id));

  return (
    <>
      <PageTitle title="Office bearers" sub={`${rows.length} people`} action={<LinkButton href="/admin/officials/new">+ Add person</LinkButton>} />
      {sp.deleted && <Notice>Deleted.</Notice>}
      <form className="mb-5 flex flex-wrap gap-3">
        <input name="q" defaultValue={q} placeholder="Search by name" className={`${inputCls} mt-0 max-w-sm`} />
        <select name="scope" defaultValue={scope ?? ""} className={`${inputCls} mt-0 w-auto`}>
          <option value="">All roles</option>
          {Object.entries(SCOPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button className="rounded-full border-2 border-ink px-5 font-semibold hover:bg-ink hover:text-white">Filter</button>
      </form>
      <div className="overflow-x-auto rounded-none border border-line bg-white">
        <table className="w-full text-[0.95rem]">
          <thead className="border-b border-line bg-paper"><tr><th className={th}>Name</th><th className={th}>Designation</th><th className={th}>Role</th><th className={th}>Division</th><th className={th}>Status</th></tr></thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-paper">
                <td className={td}><Link href={`/admin/officials/${r.id}`} className="font-semibold hover:text-brand">{r.name}</Link>{r.featured && <span className="ml-2 rounded bg-signal px-1.5 py-0.5 text-[0.65rem] font-bold uppercase">Home</span>}</td>
                <td className={td}>{r.designation}</td>
                <td className={td}>{SCOPE_LABEL[r.scope] ?? r.scope}</td>
                <td className={td}>{r.division ?? "–"}</td>
                <td className={td}>{r.active ? "Active" : <span className="text-muted">Hidden</span>}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-muted">Nobody found.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
