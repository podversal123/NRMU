import { asc } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import UploadField from "../../UploadField";
import { SubmitButton } from "../../SubmitButton";
import { Card, Notice, PageTitle, inputCls } from "../../ui";
import { saveSettings } from "./actions";

export const metadata = { title: "Site text" };

const GROUP_LABEL: Record<string, string> = {
  org: "Organisation", page: "Inner page banner", hero: "Home banner & intro", board: "Latest orders box", home: "Home page sections", cta: "Buttons",
  stats: "Numbers", footer: "Footer", site: "Website", orders: "Orders page", officials: "Office bearers page", division: "Division labels",
  divisions: "Divisions page", women: "Women wing page", youth: "Youth page", gallery: "Gallery page", join: "Join page",
};

export default async function SettingsAdmin({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  await requireAdmin(["super_admin"]);
  const sp = await searchParams;
  const rows = await getDb().select().from(schema.siteSettings).orderBy(asc(schema.siteSettings.group), asc(schema.siteSettings.key));
  const groups = new Map<string, typeof rows>();
  for (const r of rows) groups.set(r.group, [...(groups.get(r.group) ?? []), r]);

  return (
    <>
      <PageTitle title="Site text" sub="All headings and wording on the public website. English is required; Hindi is optional." />
      {sp.saved && <Notice>Saved. The public website is updated.</Notice>}
      <form action={saveSettings} className="space-y-8">
        {[...groups.entries()].map(([group, items]) => (
          <Card key={group}>
            <h2 className="font-display text-2xl font-bold">{GROUP_LABEL[group] ?? group}</h2>
            <div className="mt-5 space-y-6">
              {items.map((r) =>
                /[._]image$/.test(r.key) ? (
                  <UploadField key={r.key} name={`img:${r.key}`} label={`${r.key} (replace the photo)`} accept="image/*" folder="site" initial={r.valueEn ? [r.valueEn] : []} />
                ) : (
                  <div key={r.key} className="grid gap-3 md:grid-cols-2">
                    <label className="block text-sm font-semibold">
                      <span className="font-mono text-xs text-muted">{r.key}</span> · English
                      <textarea name={`en:${r.key}`} rows={r.valueEn.length > 90 ? 3 : 1} defaultValue={r.valueEn} className={inputCls} />
                    </label>
                    <label className="block text-sm font-semibold">
                      <span className="text-xs text-muted">&nbsp;</span> · हिंदी
                      <textarea name={`hi:${r.key}`} rows={(r.valueHi ?? "").length > 90 ? 3 : 1} defaultValue={r.valueHi ?? ""} className={inputCls} />
                    </label>
                  </div>
                ),
              )}
            </div>
          </Card>
        ))}
        <div className="sticky bottom-4 flex justify-end"><SubmitButton className="btn-primary px-8 py-3 text-lg">Save all changes</SubmitButton></div>
      </form>
    </>
  );
}
