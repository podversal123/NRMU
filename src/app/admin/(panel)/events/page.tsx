import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { LinkButton, Notice, PageTitle, td, th } from "../../ui";

export const metadata = { title: "Events" };

export default async function EventsAdmin({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  await requireAdmin(["super_admin", "editor"]);
  const sp = await searchParams;
  const rows = await getDb()
    .select({ e: schema.events, division: schema.divisions.nameEn })
    .from(schema.events)
    .leftJoin(schema.divisions, eq(schema.divisions.id, schema.events.divisionId))
    .orderBy(desc(schema.events.startsAt))
    .limit(200);
  return (
    <>
      <PageTitle title="Events & meetings" sub="Meetings, conferences and programmes shown on the website." action={<LinkButton href="/admin/events/new">+ Add event</LinkButton>} />
      {sp.deleted && <Notice>Deleted.</Notice>}
      <div className="overflow-x-auto border border-line bg-white">
        <table className="w-full text-[0.95rem]">
          <thead className="border-b border-line bg-paper"><tr><th className={th}>When</th><th className={th}>Title</th><th className={th}>Division</th><th className={th}>Status</th></tr></thead>
          <tbody className="divide-y divide-line">
            {rows.map(({ e, division }) => (
              <tr key={e.id} className="hover:bg-paper">
                <td className={`${td} whitespace-nowrap text-sm`}>{e.startsAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })}</td>
                <td className={td}><Link href={`/admin/events/${e.id}`} className="font-semibold hover:text-brand">{e.titleEn}</Link></td>
                <td className={td}>{division ?? "All"}</td>
                <td className={td}>{e.published ? "Visible" : <span className="text-muted">Hidden</span>}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={4} className="px-4 py-10 text-center text-muted">No events yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
