import Link from "next/link";
import { and, desc, eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { PageTitle, td, th } from "../../ui";

export const metadata = { title: "Grievances" };
const STATUS: Record<string, string> = { open: "Open", in_progress: "In progress", resolved: "Resolved", closed: "Closed" };

export default async function GrievancesAdmin({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const admin = await requireAdmin();
  const sp = await searchParams;
  const status = sp.status && STATUS[sp.status] ? sp.status : undefined;
  const level = [1, 2, 3].includes(Number(sp.level)) ? Number(sp.level) : undefined;
  const db = getDb();
  const settings = await db.select().from(schema.siteSettings).where(sql`${schema.siteSettings.key} like 'grievance.level.%'`);
  const levelName = (n: number) => settings.find((x) => x.key === `grievance.level.${n}`)?.valueEn ?? String(n);

  const rows = await db
    .select({
      g: schema.grievances,
      division: schema.divisions.nameEn,
      type: schema.grievanceTypes.nameEn,
      waiting: sql<number>`floor(extract(epoch from (now() - ${schema.grievances.updatedAt})) / 86400)::int`,
    })
    .from(schema.grievances)
    .leftJoin(schema.divisions, eq(schema.divisions.id, schema.grievances.divisionId))
    .leftJoin(schema.grievanceTypes, eq(schema.grievanceTypes.id, schema.grievances.typeId))
    .where(
      and(
        status ? eq(schema.grievances.status, status) : undefined,
        level ? eq(schema.grievances.level, level) : undefined,
        admin.role === "division_admin" ? eq(schema.grievances.divisionId, admin.divisionId ?? -1) : undefined,
      ),
    )
    .orderBy(desc(schema.grievances.updatedAt))
    .limit(300);

  const pill = (active: boolean) => `rounded-full border-2 px-4 py-1.5 text-sm font-semibold ${active ? "border-ink bg-ink text-light" : "border-line hover:border-ink"}`;
  const q = (o: Record<string, string | number | undefined>) => `?${new URLSearchParams(Object.entries({ status, level, ...o }).filter(([, v]) => v !== undefined && v !== "").map(([k, v]) => [k, String(v)]))}`;

  return (
    <>
      <PageTitle title="Grievances" sub="Problems raised by members. A grievance that is not acted upon is passed up automatically." />
      <div className="mb-5 flex flex-wrap gap-2">
        <Link href={q({ status: undefined })} className={pill(!status)}>All</Link>
        {Object.entries(STATUS).map(([k, v]) => <Link key={k} href={q({ status: k })} className={pill(status === k)}>{v}</Link>)}
        <span className="mx-2 w-px bg-line" />
        <Link href={q({ level: undefined })} className={pill(!level)}>Any level</Link>
        {[1, 2, 3].map((n) => <Link key={n} href={q({ level: n })} className={pill(level === n)}>{levelName(n)}</Link>)}
      </div>
      <div className="overflow-x-auto border border-line bg-white">
        <table className="w-full text-[0.95rem]">
          <thead className="border-b border-line bg-paper">
            <tr><th className={th}>Ticket</th><th className={th}>Member</th><th className={th}>Division</th><th className={th}>Subject</th><th className={th}>With</th><th className={th}>Status</th><th className={th}>Waiting</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map(({ g, division, type, waiting }) => (
              <tr key={g.id} className="hover:bg-paper">
                <td className={`${td} whitespace-nowrap font-mono text-xs`}><Link href={`/admin/grievances/${g.id}`} className="font-bold text-brand hover:underline">{g.ticket}</Link></td>
                <td className={td}>{g.name}<div className="text-sm text-muted">{g.mobile}</div></td>
                <td className={td}>{division ?? "–"}</td>
                <td className={`${td} max-w-xs`}><span className="font-medium">{g.subject}</span>{type && <div className="text-sm text-muted">{type}</div>}</td>
                <td className={td}>{levelName(g.level)}</td>
                <td className={td}><span className={`px-2 py-0.5 text-xs font-bold uppercase ${g.status === "resolved" || g.status === "closed" ? "bg-soft text-ink" : "bg-ink text-signal"}`}>{STATUS[g.status]}</span></td>
                <td className={`${td} whitespace-nowrap text-sm text-muted`}>{waiting} d</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-muted">No grievances.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
