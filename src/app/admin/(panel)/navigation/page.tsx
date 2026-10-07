import { asc } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { SubmitButton } from "../../SubmitButton";
import { Card, Notice, PageTitle, inputCls } from "../../ui";
import { saveChips, saveNav, saveQuick } from "./actions";

export const metadata = { title: "Menus & links" };
const small = "w-full rounded-lg border-2 border-line bg-white px-2.5 py-1.5 text-sm focus:border-ink focus:outline-none";
const ICONS = ["doc", "rupee", "shield", "building", "people", "mail"];

export default async function NavigationAdmin({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  await requireAdmin(["super_admin"]);
  const sp = await searchParams;
  const db = getDb();
  const [nav, quick, chips] = await Promise.all([
    db.select().from(schema.navItems).orderBy(asc(schema.navItems.area), asc(schema.navItems.sort)),
    db.select().from(schema.quickLinks).orderBy(asc(schema.quickLinks.sort)),
    db.select().from(schema.searchChips).orderBy(asc(schema.searchChips.sort)),
  ]);

  return (
    <>
      <PageTitle title="Menus & links" sub="Website menu, footer links, home page shortcuts and popular searches." />
      {sp.saved && <Notice>Saved. The public website is updated.</Notice>}

      <Card>
        <h2 className="font-display text-2xl font-bold">Menu & footer links</h2>
        <p className="mt-1 text-sm text-muted">Path starts with “/” (for example /orders). Leave empty path for the home page. Smaller order shows first.</p>
        <form action={saveNav} className="mt-5 space-y-3">
          <input type="hidden" name="navIds" value={nav.map((n) => n.id).join(",")} />
          <div className="hidden grid-cols-[5.5rem_1fr_1fr_9rem_4.5rem_4rem_4rem] gap-2 text-xs font-bold uppercase tracking-wider text-muted lg:grid">
            <span>Where</span><span>English</span><span>हिंदी</span><span>Path</span><span>Order</span><span>Show</span><span>Delete</span>
          </div>
          {nav.map((n) => (
            <div key={n.id} className="grid items-center gap-2 lg:grid-cols-[5.5rem_1fr_1fr_9rem_4.5rem_4rem_4rem]">
              <span className="text-xs font-bold uppercase text-muted">{n.area}</span>
              <input name={`nav_labelEn_${n.id}`} defaultValue={n.labelEn} className={small} aria-label="English label" />
              <input name={`nav_labelHi_${n.id}`} defaultValue={n.labelHi ?? ""} className={small} aria-label="Hindi label" />
              <input name={`nav_href_${n.id}`} defaultValue={n.href} className={small} aria-label="Path" />
              <input type="number" name={`nav_sort_${n.id}`} defaultValue={n.sort} className={small} aria-label="Order" />
              <input type="checkbox" name={`nav_active_${n.id}`} defaultChecked={n.active} className="h-5 w-5" aria-label="Show" />
              <input type="checkbox" name={`nav_delete_${n.id}`} className="h-5 w-5" aria-label="Delete" />
            </div>
          ))}
          <div className="grid items-center gap-2 rounded-lg bg-paper p-3 lg:grid-cols-[5.5rem_1fr_1fr_9rem_4.5rem_8rem]">
            <select name="nav_area_new" className={small}><option value="header">header</option><option value="footer">footer</option></select>
            <input name="nav_labelEn_new" placeholder="New link (English)" className={small} />
            <input name="nav_labelHi_new" placeholder="हिंदी" className={small} />
            <input name="nav_href_new" placeholder="/path" className={small} />
            <input type="number" name="nav_sort_new" placeholder="Order" className={small} />
            <span className="text-xs text-muted">← add a new link</span>
          </div>
          <SubmitButton>Save menu</SubmitButton>
        </form>
      </Card>

      <Card className="mt-8">
        <h2 className="font-display text-2xl font-bold">Home page shortcuts</h2>
        <form action={saveQuick} className="mt-5 space-y-3">
          <input type="hidden" name="quickIds" value={quick.map((n) => n.id).join(",")} />
          {quick.map((q) => (
            <div key={q.id} className="grid items-center gap-2 lg:grid-cols-[1fr_1fr_1.4fr_6rem_4.5rem_4rem_4rem]">
              <input name={`q_labelEn_${q.id}`} defaultValue={q.labelEn} className={small} aria-label="English label" />
              <input name={`q_labelHi_${q.id}`} defaultValue={q.labelHi ?? ""} className={small} aria-label="Hindi label" />
              <input name={`q_href_${q.id}`} defaultValue={q.href} className={small} aria-label="Path" />
              <select name={`q_icon_${q.id}`} defaultValue={q.icon} className={small} aria-label="Icon">{ICONS.map((i) => <option key={i}>{i}</option>)}</select>
              <input type="number" name={`q_sort_${q.id}`} defaultValue={q.sort} className={small} aria-label="Order" />
              <input type="checkbox" name={`q_active_${q.id}`} defaultChecked={q.active} className="h-5 w-5" aria-label="Show" />
              <input type="checkbox" name={`q_delete_${q.id}`} className="h-5 w-5" aria-label="Delete" />
            </div>
          ))}
          <div className="grid items-center gap-2 rounded-lg bg-paper p-3 lg:grid-cols-[1fr_1fr_1.4fr_6rem_4.5rem]">
            <input name="q_labelEn_new" placeholder="New shortcut (English)" className={small} />
            <input name="q_labelHi_new" placeholder="हिंदी" className={small} />
            <input name="q_href_new" placeholder="/orders?cat=slug" className={small} />
            <select name="q_icon_new" className={small}>{ICONS.map((i) => <option key={i}>{i}</option>)}</select>
            <input type="number" name="q_sort_new" placeholder="Order" className={small} />
          </div>
          <SubmitButton>Save shortcuts</SubmitButton>
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
