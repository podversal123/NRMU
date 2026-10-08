import Link from "next/link";
import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { Card, PageTitle } from "../ui";

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const admin = await requireAdmin();
  const sp = await searchParams;
  const r = (await getDb().execute(sql`
    select (select count(*)::int from posts where status = 'published') posts,
           (select count(*)::int from posts where status = 'draft') drafts,
           (select count(*)::int from office_bearers where active) officials,
           (select count(*)::int from divisions where active) divisions,
           (select count(*)::int from join_requests where status = 'new') new_requests,
           (select count(*)::int from join_requests) all_requests`)) as unknown as { rows?: Record<string, number>[] } & Record<string, number>[];
  const c = (r.rows ?? r)[0];

  const tiles = [
    { label: "Published orders & news", value: c.posts, href: "/admin/posts" },
    { label: "Drafts", value: c.drafts, href: "/admin/posts?status=draft" },
    { label: "Office bearers", value: c.officials, href: "/admin/officials" },
    { label: "New join requests", value: c.new_requests, href: "/admin/requests", hot: c.new_requests > 0 },
  ];

  return (
    <>
      <PageTitle title={`Welcome, ${admin.name.split(" ")[0]}`} sub="Everything on the public website is managed from here." />
      {sp.denied && <p className="mb-6 rounded-lg border-2 border-brand bg-brand/10 px-4 py-3 text-sm font-semibold text-brand-deep">You do not have access to that section.</p>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map((t) => (
          <Link key={t.label} href={t.href} className="group rounded-none border border-line bg-white p-6 transition hover:border-ink">
            <p className={`text-4xl font-bold leading-none ${t.hot ? "text-brand" : ""}`}>{t.value}</p>
            <p className="mt-3 text-sm font-semibold text-muted">{t.label}</p>
          </Link>
        ))}
      </div>
      <Card className="mt-8">
        <h2 className="font-display text-2xl font-bold">Quick actions</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/admin/posts/new" className="btn-primary px-5 py-2.5 text-sm">+ Add order / news</Link>
          <Link href="/admin/officials/new" className="rounded-full border-2 border-ink px-5 py-2 text-sm font-semibold hover:bg-ink hover:text-white">+ Add office bearer</Link>
          <Link href="/admin/requests" className="rounded-full border-2 border-ink px-5 py-2 text-sm font-semibold hover:bg-ink hover:text-white">View join requests</Link>
        </div>
      </Card>
    </>
  );
}
