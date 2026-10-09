import Link from "next/link";
import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { fmtDay, fmtTime, getMeetingAlerts, meetingState, modeLabel, relative, type MeetingState } from "@/lib/meetings";
import { LinkButton, Notice, PageTitle, td, th } from "../../ui";

// Always depends on the signed-in admin, so it is rendered per request.
export const instant = false;
export const metadata = { title: "Meetings" };

const VIEWS = [
  { key: "upcoming", label: "Upcoming" },
  { key: "past", label: "Past" },
  { key: "cancelled", label: "Cancelled" },
] as const;

const BADGE: Record<MeetingState, { text: string; cls: string }> = {
  live: { text: "Live now", cls: "bg-brand text-white" },
  upcoming: { text: "Scheduled", cls: "bg-soft/60 text-ink" },
  ended: { text: "Mark completed", cls: "border border-brand text-brand" },
  completed: { text: "Completed", cls: "bg-ink text-light" },
  cancelled: { text: "Cancelled", cls: "border border-line text-muted" },
};

type Row = { id: number; title_en: string; type_en: string | null; division_en: string | null; mode: string; status: string; s_ms: string; e_ms: string; invited: number; yes: number; attended: number; has_record: boolean };

export default async function MeetingsAdmin({ searchParams }: { searchParams: Promise<{ view?: string; deleted?: string }> }) {
  await requireAdmin(["super_admin"]);
  const sp = await searchParams;
  const view = VIEWS.find((v) => v.key === sp.view)?.key ?? "upcoming";
  const db = getDb();
  const where =
    view === "upcoming" ? sql`m.status = 'scheduled' and m.ends_at >= now()` : view === "past" ? sql`m.status <> 'cancelled' and (m.status = 'completed' or m.ends_at < now())` : sql`m.status = 'cancelled'`;
  const order = view === "upcoming" ? sql`m.starts_at asc` : sql`m.starts_at desc`;

  const [res, counts, alerts] = await Promise.all([
    db.execute(sql`
      select m.id, m.title_en, t.name_en as type_en, d.name_en as division_en, m.mode, m.status,
             (extract(epoch from m.starts_at) * 1000)::bigint as s_ms, (extract(epoch from m.ends_at) * 1000)::bigint as e_ms,
             (select count(*)::int from meeting_invitees i where i.meeting_id = m.id) as invited,
             (select count(*)::int from meeting_invitees i where i.meeting_id = m.id and i.rsvp = 'yes') as yes,
             (select count(*)::int from meeting_invitees i where i.meeting_id = m.id and i.attended) as attended,
             (m.minutes_url is not null or m.minutes_text is not null or m.recording_url is not null) as has_record
      from meetings m
      left join meeting_types t on t.id = m.type_id
      left join divisions d on d.id = m.division_id
      where ${where} order by ${order} limit 200`),
    db.execute(sql`
      select count(*) filter (where status = 'scheduled' and ends_at >= now())::int as upcoming,
             count(*) filter (where status <> 'cancelled' and (status = 'completed' or ends_at < now()))::int as past,
             count(*) filter (where status = 'cancelled')::int as cancelled
      from meetings`),
    getMeetingAlerts(),
  ]);
  const rows = ((res as unknown as { rows?: Row[] }).rows ?? (res as unknown as Row[])) as Row[];
  const c = (((counts as unknown as { rows?: Record<string, number>[] }).rows ?? (counts as unknown as Record<string, number>[])) as Record<string, number>[])[0];
  const now = new Date();
  const todays = alerts.filter((a) => a.group !== "soon");

  return (
    <>
      <PageTitle title="Meetings" sub="Schedule meetings, invite people, hold them online and keep the record." action={<LinkButton href="/admin/meetings/new">+ Schedule a meeting</LinkButton>} />
      {sp.deleted && <Notice>Deleted.</Notice>}

      {todays.length > 0 && (
        <section aria-label="Meetings today" className="mb-6 border-2 border-brand bg-white p-5">
          <h2 className="font-display text-xl font-bold text-brand">{todays.some((a) => a.group === "live") ? "A meeting is on now" : "Meetings today"}</h2>
          <ul className="mt-3 divide-y divide-line">
            {todays.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
                <Link href={`/admin/meetings/${a.id}`} className="font-semibold hover:text-brand">{a.titleEn}</Link>
                <span className="text-sm text-muted">
                  {a.group === "live" ? "Live now" : `${fmtTime(a.startsAt)}, ${relative(a.startsAt, now)}`}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <nav aria-label="Meetings" className="mb-5 flex flex-wrap gap-2">
        {VIEWS.map((v) => (
          <Link
            key={v.key}
            href={v.key === "upcoming" ? "/admin/meetings" : `/admin/meetings?view=${v.key}`}
            aria-current={view === v.key ? "page" : undefined}
            className={`rounded-full border-2 px-4 py-2.5 text-sm font-semibold lg:py-1.5 ${view === v.key ? "border-ink bg-ink text-light" : "border-line hover:border-ink"}`}
          >
            {v.label} <span className="opacity-70">{c[v.key]}</span>
          </Link>
        ))}
      </nav>

      <div className="overflow-x-auto border border-line bg-white">
        <table className="w-full text-[0.95rem]">
          <thead className="border-b border-line bg-paper">
            <tr><th className={th}>When</th><th className={th}>Meeting</th><th className={th}>For</th><th className={th}>People</th><th className={th}>Status</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => {
              const startsAt = new Date(Number(r.s_ms));
              const endsAt = new Date(Number(r.e_ms));
              const state = meetingState({ status: r.status, startsAt, endsAt }, now);
              const b = BADGE[state];
              return (
                <tr key={r.id} className="hover:bg-paper">
                  <td className={`${td} whitespace-nowrap text-sm`}>
                    <p className="font-semibold">{fmtDay(startsAt)}</p>
                    <p className="text-muted">{fmtTime(startsAt)} to {fmtTime(endsAt)}</p>
                    {state === "upcoming" && <p className="text-xs text-muted">{relative(startsAt, now)}</p>}
                  </td>
                  <td className={td}>
                    <Link href={`/admin/meetings/${r.id}`} className="font-semibold hover:text-brand">{r.title_en}</Link>
                    <p className="text-sm text-muted">{[r.type_en, modeLabel(r.mode)].filter(Boolean).join(" · ")}</p>
                  </td>
                  <td className={td}>{r.division_en ?? "Whole union"}</td>
                  <td className={`${td} whitespace-nowrap text-sm`}>
                    {r.invited ? `${r.invited} invited` : <span className="text-muted">Nobody invited</span>}
                    {r.invited > 0 && <p className="text-muted">{r.yes} coming{state === "completed" || state === "ended" ? ` · ${r.attended} attended` : ""}</p>}
                  </td>
                  <td className={td}>
                    <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${b.cls}`}>{b.text}</span>
                    {state === "completed" && !r.has_record && <p className="mt-1 text-xs text-muted">No minutes yet</p>}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-muted">{view === "upcoming" ? "No meetings are scheduled." : view === "past" ? "No past meetings." : "No cancelled meetings."}</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
