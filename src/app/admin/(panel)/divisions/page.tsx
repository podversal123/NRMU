import Link from "next/link";
import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { LinkButton, PageTitle, td, th } from "../../ui";

// Always depends on the signed-in admin, so it is rendered per request.
export const instant = false;
export const metadata = { title: "Divisions & branches" };

export default async function DivisionsAdmin() {
  await requireAdmin(["super_admin", "editor"]);
  const res = (await getDb().execute(sql`
    select d.id, d.name_en, d.name_hi, d.active, d.sort,
           (select count(*)::int from branches b where b.division_id = d.id) branches,
           (select count(*)::int from office_bearers o where o.division_id = d.id) people
    from divisions d order by d.sort, d.id`)) as unknown as { rows?: Record<string, unknown>[] } & Record<string, unknown>[];
  const rows = (res.rows ?? res) as { id: number; name_en: string; name_hi: string | null; active: boolean; branches: number; people: number }[];
  return (
    <>
      <PageTitle title="Divisions & branches" action={<LinkButton href="/admin/divisions/new">+ Add division</LinkButton>} />
      <div className="overflow-x-auto rounded-none border border-line bg-white">
        <table className="w-full text-[0.95rem]">
          <thead className="border-b border-line bg-paper"><tr><th className={th}>Division</th><th className={th}>Hindi</th><th className={th}>Branches</th><th className={th}>People</th><th className={th}>Status</th></tr></thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-paper">
                <td className={td}><Link href={`/admin/divisions/${r.id}`} className="font-semibold hover:text-brand">{r.name_en}</Link></td>
                <td className={td}>{r.name_hi ?? "–"}</td>
                <td className={td}>{r.branches}</td>
                <td className={td}>{r.people}</td>
                <td className={td}>{r.active ? "Visible" : <span className="text-muted">Hidden</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
