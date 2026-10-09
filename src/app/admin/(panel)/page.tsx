import Link from "next/link";
import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { fmtDay, fmtTime, getMeetingAlerts, relative } from "@/lib/meetings";
import { Card, PageTitle } from "../ui";

// Always depends on the signed-in admin, so it is rendered per request.
export const instant = false;
export default async function Dashboard({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const admin = await requireAdmin();
  const sp = await searchParams;
  // A division admin sees the numbers of their own division only.
  const mine = admin.role === "division_admin" ? sql`and division_id = ${admin.divisionId ?? -1}` : sql``;
  const r = (await getDb().execute(sql`
    select (select count(*)::int from posts where status = 'published') posts,
           (select count(*)::int from posts where status = 'draft') drafts,
           (select count(*)::int from office_bearers where active) officials,
           (select count(*)::int from divisions where active) divisions,
           (select count(*)::int from members where status = 'pending' ${mine}) new_requests,
           (select count(*)::int from members where true ${mine}) all_requests`)) as unknown as { rows?: Record<string, number>[] } & Record<string, number>[];
  const c = (r.rows ?? r)[0];
  const alerts = admin.role === "super_admin" ? await getMeetingAlerts() : [];
  const now = new Date();

  const tiles = [
    { label: "Published orders & news", value: c.posts, href: "/admin/posts" },
    { label: "Drafts", value: c.drafts, href: "/admin/posts?status=draft" },
    { label: "Office bearers", value: c.officials, href: "/admin/officials" },
    { label: "Members waiting for approval", value: c.new_requests, href: "/admin/members", hot: c.new_requests > 0 },
  ];

  return (
    <>
      <PageTitle title={`Welcome, ${admin.name.split(" ")[0]}`} sub="Everything on the public website is managed from here." />
      {sp.denied && <p className="mb-6 rounded-lg border-2 border-brand bg-brand/10 px-4 py-3 text-sm font-semibold text-brand-deep">You do not have access to that section.</p>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map((t) => (
          <Link key={t.label} href={t.href} className="group rounded-none border border-line bg-white p-6 transition hover:border-ink">
            <p className={`text-4xl font-bold leading-none ${t.hot ? "text-brand" : ""}`}>{t.value}</p>
            <p className="mt-3 text-sm font-semibold text-muted">{t.label}</p>
          </Link>
        ))}
      </div>
      {alerts.length > 0 && (
        <Card className="mt-8">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="font-display text-2xl font-bold">{alerts.some((a) => a.group === "live") ? "A meeting is on now" : "Meetings coming up"}</h2>
            <Link href="/admin/meetings" className="inline-block py-2 text-sm font-semibold text-brand">All meetings →</Link>
          </div>
          <ul className="mt-3 divide-y divide-line">
            {alerts.slice(0, 6).map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3">
                <Link href={`/admin/meetings/${a.id}`} className="font-semibold hover:text-brand">{a.titleEn}</Link>
                <span className={`text-sm ${a.group === "soon" ? "text-muted" : "font-semibold text-brand"}`}>
                  {a.group === "live" ? "Live now" : a.group === "today" ? `Today ${fmtTime(a.startsAt)}, ${relative(a.startsAt, now)}` : `${fmtDay(a.startsAt)}, ${fmtTime(a.startsAt)}`}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
      <Card className="mt-8">
        <h2 className="font-display text-2xl font-bold">Quick actions</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/admin/posts/new" className="btn-primary px-5 py-2.5 text-sm">+ Add order / news</Link>
          <Link href="/admin/officials/new" className="rounded-full border-2 border-ink px-5 py-2 text-sm font-semibold hover:bg-ink hover:text-white">+ Add office bearer</Link>
          <Link href="/admin/members" className="rounded-full border-2 border-ink px-5 py-2 text-sm font-semibold hover:bg-ink hover:text-white">View members</Link>
          {admin.role === "super_admin" && <Link href="/admin/meetings/new" className="rounded-full border-2 border-ink px-5 py-2 text-sm font-semibold hover:bg-ink hover:text-white">+ Schedule a meeting</Link>}
        </div>
      </Card>
    </>
  );
}
