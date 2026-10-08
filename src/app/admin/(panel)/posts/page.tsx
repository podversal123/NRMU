import Link from "next/link";
import { and, desc, eq, ilike, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { Notice, PageTitle, LinkButton, inputCls, td, th } from "../../ui";

// Always depends on the signed-in admin, so it is rendered per request.
export const instant = false;
export const metadata = { title: "Orders & news" };
const SIZE = 25;

export default async function PostsAdmin({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin(["super_admin", "editor"]);
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 100);
  const status = sp.status === "draft" ? "draft" : sp.status === "published" ? "published" : undefined;
  const page = Math.max(1, Number(sp.page) || 1);

  const where = and(q ? ilike(schema.posts.titleEn, `%${q}%`) : undefined, status ? eq(schema.posts.status, status) : undefined);
  const db = getDb();
  const [rows, [{ n }]] = await Promise.all([
    db.select({ id: schema.posts.id, title: schema.posts.titleEn, date: schema.posts.publishedAt, status: schema.posts.status, files: sql<number>`(select count(*)::int from post_files pf where pf.post_id = ${schema.posts.id})` })
      .from(schema.posts).where(where).orderBy(desc(schema.posts.publishedAt), desc(schema.posts.id)).limit(SIZE).offset((page - 1) * SIZE),
    db.select({ n: sql<number>`count(*)::int` }).from(schema.posts).where(where),
  ]);
  const pages = Math.max(1, Math.ceil(n / SIZE));
  const qs = (p: number) => `?${new URLSearchParams({ ...(q ? { q } : {}), ...(status ? { status } : {}), page: String(p) })}`;

  return (
    <>
      <PageTitle title="Orders & news" sub={`${n.toLocaleString("en-IN")} items`} action={<LinkButton href="/admin/posts/new">+ Add new</LinkButton>} />
      {sp.deleted && <Notice>Deleted.</Notice>}
      <form className="mb-5 flex flex-wrap gap-3">
        <input name="q" defaultValue={q} placeholder="Search by title" className={`${inputCls} mt-0 max-w-sm`} />
        <select name="status" defaultValue={status ?? ""} className={`${inputCls} mt-0 w-auto`}>
          <option value="">All</option>
          <option value="published">Published</option>
          <option value="draft">Drafts</option>
        </select>
        <button className="rounded-full border-2 border-ink px-5 font-semibold hover:bg-ink hover:text-white">Filter</button>
      </form>
      <div className="overflow-x-auto rounded-none border border-line bg-white">
        <table className="w-full text-[0.95rem]">
          <thead className="border-b border-line bg-paper">
            <tr><th className={th}>Date</th><th className={th}>Title</th><th className={th}>Files</th><th className={th}>Status</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-paper">
                <td className={`${td} whitespace-nowrap font-mono text-xs`}>{r.date}</td>
                <td className={td}><Link href={`/admin/posts/${r.id}`} className="font-semibold hover:text-brand">{r.title}</Link></td>
                <td className={td}>{Number(r.files) || "–"}</td>
                <td className={td}>
                  <span className={`rounded px-2 py-0.5 text-xs font-bold uppercase ${r.status === "published" ? "bg-ink text-signal" : "bg-soft text-ink"}`}>{r.status}</span>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={4} className="px-4 py-10 text-center text-muted">Nothing found.</td></tr>}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="mt-5 flex items-center justify-between text-sm">
          {page > 1 ? <Link href={qs(page - 1)} className="font-semibold text-brand">← Previous</Link> : <span />}
          <span className="text-muted">Page {page} of {pages}</span>
          {page < pages ? <Link href={qs(page + 1)} className="font-semibold text-brand">Next →</Link> : <span />}
        </div>
      )}
    </>
  );
}
