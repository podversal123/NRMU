import Link from "next/link";
import { asc, sql, type SQL } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { fmtDay } from "@/lib/meetings";
import { Notice, PageTitle, inputCls, td, th } from "../../ui";
import { bulkMembers } from "./actions";

// Always depends on the signed-in admin, so it is rendered per request.
export const instant = false;
export const metadata = { title: "Members" };

const PAGE = 50;
const TABS = [
  { key: "pending", label: "Waiting for approval" },
  { key: "active", label: "Active" },
  { key: "suspended", label: "Suspended" },
  { key: "rejected", label: "Not approved" },
  { key: "all", label: "All" },
] as const;
const BADGE: Record<string, string> = {
  pending: "bg-soft/60 text-ink",
  active: "bg-ink text-light",
  suspended: "border border-brand text-brand",
  rejected: "border border-line text-muted",
};
const DONE: Record<string, string> = { approve: "Approved.", reject: "Marked as not approved.", suspend: "Suspended.", reactivate: "Reactivated.", deleted: "Deleted." };

type Row = { id: number; name: string; mobile: string; employee_id: string | null; status: string; membership_no: string | null; created_ms: string; division: string | null; branch: string | null; department: string | null };
const rowsOf = <T,>(r: unknown) => ((r as { rows?: T[] }).rows ?? r) as T[];

export default async function MembersAdmin({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const admin = await requireAdmin(["super_admin", "division_admin"]);
  const sp = await searchParams;
  const status = TABS.find((t) => t.key === sp.status)?.key ?? "pending";
  const page = Math.max(1, Number(sp.page) || 1);
  const q = (sp.q ?? "").trim().slice(0, 80);
  const divisionFilter = admin.role === "division_admin" ? admin.divisionId : Number(sp.division) || null;
  const departmentFilter = Number(sp.department) || null;
  const db = getDb();

  // Everything that narrows the list except the status tab (the tab counts need that).
  const base: SQL[] = [];
  if (divisionFilter) base.push(sql`m.division_id = ${divisionFilter}`);
  if (admin.role === "division_admin" && !divisionFilter) base.push(sql`false`);
  if (departmentFilter) base.push(sql`m.department_id = ${departmentFilter}`);
  if (q) {
    if (/^\d+$/.test(q)) base.push(sql`m.mobile like ${q + "%"}`);
    else {
      const like = `%${q.replace(/[\\%_]/g, "\\$&")}%`;
      base.push(sql`(m.name ilike ${like} or m.employee_id ilike ${like} or m.membership_no ilike ${like})`);
    }
  }
  const baseWhere = base.length ? sql`where ${sql.join(base, sql` and `)}` : sql``;
  const listWhere = status === "all" ? baseWhere : sql`${base.length ? sql`${baseWhere} and` : sql`where`} m.status = ${status}`;

  const [list, counts, divisions, departments] = await Promise.all([
    db.execute(sql`
      select m.id, m.name, m.mobile, m.employee_id, m.status, m.membership_no, (extract(epoch from m.created_at) * 1000)::bigint as created_ms,
             d.name_en as division, b.name_en as branch, dp.name_en as department
      from members m
      left join divisions d on d.id = m.division_id
      left join branches b on b.id = m.branch_id
      left join departments dp on dp.id = m.department_id
      ${listWhere} order by m.created_at desc, m.id desc limit ${PAGE + 1} offset ${(page - 1) * PAGE}`),
    db.execute(sql`select status, count(*)::int as n from members m ${baseWhere} group by status`),
    db.select().from(schema.divisions).orderBy(asc(schema.divisions.sort)),
    db.select().from(schema.departments).orderBy(asc(schema.departments.sort)),
  ]);
  const rows = rowsOf<Row>(list);
  const more = rows.length > PAGE;
  const shown = rows.slice(0, PAGE);
  const count: Record<string, number> = {};
  for (const c of rowsOf<{ status: string; n: number }>(counts)) count[c.status] = c.n;
  const total = Object.values(count).reduce((a, b) => a + b, 0);

  const qs = (over: Record<string, string | number | null | undefined>) => {
    const p = new URLSearchParams();
    const merged = { status, q: q || undefined, division: admin.role === "super_admin" ? divisionFilter : undefined, department: departmentFilter, ...over };
    for (const [k, v] of Object.entries(merged)) if (v !== undefined && v !== null && v !== "" && !(k === "status" && v === "pending")) p.set(k, String(v));
    const s = p.toString();
    return `/admin/members${s ? `?${s}` : ""}`;
  };
  const here = qs({ page: page > 1 ? page : undefined });
  const actions = status === "pending" ? ["approve", "reject"] : status === "active" ? ["suspend"] : status === "suspended" || status === "rejected" ? ["reactivate"] : ["approve", "reject", "suspend", "reactivate"];
  const label: Record<string, string> = { approve: "Approve", reject: "Not approved", suspend: "Suspend", reactivate: "Reactivate" };

  return (
    <>
      <PageTitle title="Members" sub={admin.role === "division_admin" ? "The members of your division." : "People who registered on the website. Only approved members can sign in."} />
      {sp.done && DONE[sp.done] && <Notice>{DONE[sp.done]}</Notice>}

      <nav aria-label="Members" className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={qs({ status: t.key, page: undefined })}
            aria-current={status === t.key ? "page" : undefined}
            className={`rounded-full border-2 px-4 py-2.5 text-sm font-semibold lg:py-1.5 ${status === t.key ? "border-ink bg-ink text-light" : "border-line hover:border-ink"}`}
          >
            {t.label} <span className="opacity-70">{t.key === "all" ? total : (count[t.key] ?? 0)}</span>
          </Link>
        ))}
      </nav>

      <form method="get" action="/admin/members" className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
        {status !== "pending" && <input type="hidden" name="status" value={status} />}
        <input name="q" defaultValue={q} placeholder="Name, mobile number, employee ID or membership no." aria-label="Search members" className={inputCls + " !mt-0"} />
        {admin.role === "super_admin" && (
          <select name="division" defaultValue={divisionFilter ?? ""} aria-label="Division" className={inputCls + " !mt-0"}>
            <option value="">All divisions</option>
            {divisions.map((d) => <option key={d.id} value={d.id}>{d.nameEn}</option>)}
          </select>
        )}
        <select name="department" defaultValue={departmentFilter ?? ""} aria-label="Department" className={inputCls + " !mt-0"}>
          <option value="">All departments</option>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.nameEn}</option>)}
        </select>
        <button className="rounded-full border-2 border-ink px-6 py-2.5 font-semibold hover:bg-ink hover:text-white">Search</button>
      </form>

      <form action={bulkMembers}>
        <input type="hidden" name="back" value={here} />
        <div className="overflow-x-auto border border-line bg-white">
          <table className="w-full text-[0.95rem]">
            <thead className="border-b border-line bg-paper">
              <tr><th className={th}><span className="sr-only">Select</span></th><th className={th}>Member</th><th className={th}>Division and branch</th><th className={th}>Department</th><th className={th}>Registered</th><th className={th}>Status</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {shown.map((r) => (
                <tr key={r.id} className="hover:bg-paper">
                  <td className={td}>
                    <label className="grid h-11 w-11 cursor-pointer place-items-center">
                      <input type="checkbox" name="ids" value={r.id} aria-label={`Select ${r.name}`} className="h-6 w-6" />
                    </label>
                  </td>
                  <td className={td}>
                    <Link href={`/admin/members/${r.id}`} className="font-semibold hover:text-brand">{r.name}</Link>
                    <p className="text-sm text-muted">{r.mobile}{r.employee_id ? ` · ID ${r.employee_id}` : ""}{r.membership_no ? ` · ${r.membership_no}` : ""}</p>
                  </td>
                  <td className={td}>{r.division ?? "-"}<p className="text-sm text-muted">{r.branch ?? ""}</p></td>
                  <td className={td}>{r.department ?? "-"}</td>
                  <td className={`${td} whitespace-nowrap text-sm`}>{fmtDay(new Date(Number(r.created_ms)))}</td>
                  <td className={td}><span className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${BADGE[r.status] ?? ""}`}>{TABS.find((t) => t.key === r.status)?.label ?? r.status}</span></td>
                </tr>
              ))}
              {shown.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-muted">No members here.</td></tr>}
            </tbody>
          </table>
        </div>

        {shown.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {actions.map((a) => (
              <button key={a} name="intent" value={a} className={a === "approve" || a === "reactivate" ? "btn-primary px-6 py-2.5" : "rounded-full border-2 border-brand px-5 py-2.5 text-sm font-semibold text-brand hover:bg-brand hover:text-white"}>
                {label[a]} ticked
              </button>
            ))}
          </div>
        )}
      </form>

      {(page > 1 || more) && (
        <nav aria-label="Pages" className="mt-6 flex items-center justify-between">
          {page > 1 ? <Link href={qs({ page: page - 1 })} className="inline-block py-2.5 font-semibold text-brand">← Previous</Link> : <span />}
          <span className="text-sm text-muted">Page {page}</span>
          {more ? <Link href={qs({ page: page + 1 })} className="inline-block py-2.5 font-semibold text-brand">Next →</Link> : <span />}
        </nav>
      )}
    </>
  );
}
