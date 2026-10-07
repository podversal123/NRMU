import { and, desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { PageTitle, td, th } from "../../ui";
import { setRequestStatus } from "./actions";

export const metadata = { title: "Join requests" };

export default async function RequestsAdmin({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const admin = await requireAdmin();
  const { status } = await searchParams;
  const st = status && ["new", "contacted", "closed"].includes(status) ? status : undefined;
  const rows = await getDb()
    .select({ r: schema.joinRequests, division: schema.divisions.nameEn })
    .from(schema.joinRequests)
    .leftJoin(schema.divisions, eq(schema.divisions.id, schema.joinRequests.divisionId))
    .where(and(st ? eq(schema.joinRequests.status, st) : undefined, admin.role === "division_admin" ? eq(schema.joinRequests.divisionId, admin.divisionId ?? -1) : undefined))
    .orderBy(desc(schema.joinRequests.createdAt))
    .limit(500);

  return (
    <>
      <PageTitle title="Join requests" sub="People who filled the “Join NRMU” form on the website." />
      <div className="mb-5 flex gap-2 text-sm font-semibold">
        {[["", "All"], ["new", "New"], ["contacted", "Contacted"], ["closed", "Closed"]].map(([k, v]) => (
          <a key={k} href={k ? `?status=${k}` : "?"} className={`rounded-full border-2 px-4 py-1.5 ${(st ?? "") === k ? "border-ink bg-ink text-light" : "border-line hover:border-ink"}`}>{v}</a>
        ))}
      </div>
      <div className="overflow-x-auto rounded-none border border-line bg-white">
        <table className="w-full text-[0.95rem]">
          <thead className="border-b border-line bg-paper"><tr><th className={th}>Received</th><th className={th}>Name</th><th className={th}>Contact</th><th className={th}>Division</th><th className={th}>Details</th><th className={th}>Status</th></tr></thead>
          <tbody className="divide-y divide-line">
            {rows.map(({ r, division }) => (
              <tr key={r.id}>
                <td className={`${td} whitespace-nowrap font-mono text-xs`}>{r.createdAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })}</td>
                <td className={`${td} font-semibold`}>{r.name}</td>
                <td className={td}><a href={`tel:${r.mobile}`} className="font-semibold text-brand">{r.mobile}</a>{r.email && <div className="text-sm text-muted">{r.email}</div>}</td>
                <td className={td}>{division ?? "–"}</td>
                <td className={`${td} max-w-xs text-sm text-muted`}>{[r.designation, r.employeeId && `ID ${r.employeeId}`, r.message].filter(Boolean).join(" · ") || "–"}</td>
                <td className={td}>
                  <form action={setRequestStatus} className="flex gap-2">
                    <input type="hidden" name="id" value={r.id} />
                    <select name="status" defaultValue={r.status} className="rounded-lg border-2 border-line bg-white px-2 py-1 text-sm">
                      <option value="new">New</option><option value="contacted">Contacted</option><option value="closed">Closed</option>
                    </select>
                    <button className="rounded-full bg-ink px-3 py-1 text-sm font-semibold text-light hover:bg-brand">Update</button>
                  </form>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-muted">No requests yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
