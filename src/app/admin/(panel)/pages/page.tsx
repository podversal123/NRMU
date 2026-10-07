import Link from "next/link";
import { asc } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { PageTitle, td, th } from "../../ui";

export const metadata = { title: "Pages" };

export default async function PagesAdmin() {
  await requireAdmin(["super_admin", "editor"]);
  const rows = await getDb().select({ id: schema.pages.id, slug: schema.pages.slug, title: schema.pages.titleEn, updatedAt: schema.pages.updatedAt }).from(schema.pages).orderBy(asc(schema.pages.titleEn));
  return (
    <>
      <PageTitle title="Pages" sub="Committee pages and other long-form content." />
      <div className="overflow-x-auto rounded-none border border-line bg-white">
        <table className="w-full text-[0.95rem]">
          <thead className="border-b border-line bg-paper"><tr><th className={th}>Title</th><th className={th}>Address</th><th className={th}>Updated</th></tr></thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-paper">
                <td className={td}><Link href={`/admin/pages/${r.id}`} className="font-semibold hover:text-brand">{r.title}</Link></td>
                <td className={`${td} font-mono text-xs text-muted`}>{r.slug}</td>
                <td className={`${td} text-sm text-muted`}>{r.updatedAt.toLocaleDateString("en-IN")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
