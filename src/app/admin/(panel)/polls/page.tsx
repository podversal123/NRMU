import Link from "next/link";
import { desc } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { fmtDay, relative } from "@/lib/meetings";
import { pollState } from "@/lib/polls";
import { LinkButton, Notice, PageTitle, td, th } from "../../ui";

// Always depends on the signed-in admin, so it is rendered per request.
export const instant = false;
export const metadata = { title: "Polls" };

const BADGE: Record<string, string> = {
  open: "bg-signal/30 text-ink",
  closed: "bg-line text-muted",
  draft: "bg-white text-muted border border-line",
  scheduled: "bg-soft/60 text-ink",
};

export default async function PollsAdmin({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  await requireAdmin(["super_admin", "editor"]);
  const sp = await searchParams;
  const db = getDb();
  const [polls, divisions] = await Promise.all([db.select().from(schema.polls).orderBy(desc(schema.polls.id)), db.select().from(schema.divisions)]);
  const now = new Date();

  return (
    <>
      <PageTitle title="Polls and surveys" sub="Ask the members a question and see the answers. The vote is secret: only totals are kept." action={<LinkButton href="/admin/polls/new">+ New poll</LinkButton>} />
      {sp.deleted && <Notice>Poll deleted.</Notice>}
      {polls.length === 0 ? (
        <p className="text-muted">No polls yet. Press "New poll" to ask the members their first question.</p>
      ) : (
        <div className="overflow-x-auto border border-line bg-white">
          <table className="w-full text-[0.95rem]">
            <thead className="border-b border-line bg-paper">
              <tr><th className={th}>Poll</th><th className={th}>State</th><th className={th}>For</th><th className={th}>Voted</th><th className={th}>Closes</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {polls.map((p) => {
                const state = pollState(p, now);
                return (
                  <tr key={p.id}>
                    <td className={td}><Link href={`/admin/polls/${p.id}`} className="font-semibold text-brand hover:underline">{p.titleEn}</Link></td>
                    <td className={td}><span className={`rounded-full px-3 py-1 text-sm font-semibold capitalize ${BADGE[state]}`}>{state}</span></td>
                    <td className={td}>{divisions.find((d) => d.id === p.divisionId)?.nameEn ?? "All members"}</td>
                    <td className={td}>{p.voters}</td>
                    <td className={`${td} text-sm text-muted`}>{p.endsAt ? `${fmtDay(p.endsAt)}${state === "open" ? ` (${relative(p.endsAt, now)})` : ""}` : "No end date"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
