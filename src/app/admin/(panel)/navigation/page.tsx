import { asc } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { SubmitButton } from "../../SubmitButton";
import { Card, Notice, PageTitle, inputCls } from "../../ui";
import { saveChips, saveNav } from "./actions";

export const metadata = { title: "Menus & links" };
const small = "w-full rounded-lg border-2 border-line bg-white px-2.5 py-1.5 text-sm focus:border-ink focus:outline-none";

export default async function NavigationAdmin({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  await requireAdmin(["super_admin"]);
  const sp = await searchParams;
  const db = getDb();
  const [nav, chips] = await Promise.all([
    db.select().from(schema.navItems).orderBy(asc(schema.navItems.area), asc(schema.navItems.sort)),
    db.select().from(schema.searchChips).orderBy(asc(schema.searchChips.sort)),
  ]);

  return (
    <>
      <PageTitle title="Menus & links" sub="Website menu, footer links and popular searches." />
      {sp.saved && <Notice>Saved. The public website is updated.</Notice>}

      <Card>
        <h2 className="font-display text-2xl font-bold">Menu & footer links</h2>
        <p className="mt-1 text-sm text-muted">Path starts with “/” (for example /orders); use # for a heading that only opens a dropdown; an empty path is the home page. “Under” puts an item inside a header dropdown. Areas: header = menu bar, footer = Explore list, links = Important links (full https:// address), policy = legal links at the bottom.</p>
        <form action={saveNav} className="mt-5 space-y-3">
          <input type="hidden" name="navIds" value={nav.map((n) => n.id).join(",")} />
          <div className="hidden grid-cols-[5.5rem_1fr_1fr_9rem_4.5rem_4rem_4rem] gap-2 text-xs font-bold uppercase tracking-wider text-muted lg:grid">
            <span>Where</span><span>English</span><span>हिंदी</span><span>Path</span><span>Under</span><span>Order</span><span>Show</span><span>Delete</span>
          </div>
          {nav.map((n) => (
            <div key={n.id} className="grid items-center gap-2 lg:grid-cols-[5rem_1fr_1fr_9rem_8rem_4rem_4rem_4rem]">
              <span className="text-xs font-bold uppercase text-muted">{n.area}</span>
              <input name={`nav_labelEn_${n.id}`} defaultValue={n.labelEn} className={small} aria-label="English label" />
              <input name={`nav_labelHi_${n.id}`} defaultValue={n.labelHi ?? ""} className={small} aria-label="Hindi label" />
              <input name={`nav_href_${n.id}`} defaultValue={n.href} className={small} aria-label="Path" />
              <select name={`nav_parent_${n.id}`} defaultValue={n.parentId ?? ""} className={small} aria-label="Dropdown of">
                <option value="">Top level</option>
                {nav.filter((p) => p.area === "header" && !p.parentId && p.id !== n.id).map((p) => <option key={p.id} value={p.id}>{p.labelEn}</option>)}
              </select>
              <input type="number" name={`nav_sort_${n.id}`} defaultValue={n.sort} className={small} aria-label="Order" />
              <input type="checkbox" name={`nav_active_${n.id}`} defaultChecked={n.active} className="h-5 w-5" aria-label="Show" />
              <input type="checkbox" name={`nav_delete_${n.id}`} className="h-5 w-5" aria-label="Delete" />
            </div>
          ))}
          <div className="grid items-center gap-2 rounded-lg bg-paper p-3 lg:grid-cols-[5rem_1fr_1fr_9rem_8rem_4rem]">
            <select name="nav_area_new" className={small}><option value="header">header</option><option value="footer">footer</option><option value="links">links</option><option value="policy">policy</option></select>
            <input name="nav_labelEn_new" placeholder="New link (English)" className={small} />
            <input name="nav_labelHi_new" placeholder="हिंदी" className={small} />
            <input name="nav_href_new" placeholder="/path or https://…" className={small} />
            <select name="nav_parent_new" className={small} aria-label="Dropdown of">
              <option value="">Top level</option>
              {nav.filter((p) => p.area === "header" && !p.parentId).map((p) => <option key={p.id} value={p.id}>{p.labelEn}</option>)}
            </select>
            <input type="number" name="nav_sort_new" placeholder="Order" className={small} />
            <span className="text-xs text-muted">← add a new link</span>
          </div>
          <SubmitButton>Save menu</SubmitButton>
        </form>
      </Card>

      <Card className="mt-8">
        <h2 className="font-display text-2xl font-bold">Popular searches</h2>
        <form action={saveChips} className="mt-4 max-w-xl space-y-3">
          <textarea name="terms" rows={4} defaultValue={chips.map((c) => c.term).join("\n")} className={inputCls} />
          <p className="text-xs text-muted">One per line. Shown as chips under the home page search box.</p>
          <SubmitButton>Save searches</SubmitButton>
        </form>
      </Card>
    </>
  );
}
