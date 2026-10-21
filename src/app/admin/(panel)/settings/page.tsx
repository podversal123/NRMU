import { asc } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { LANGUAGES } from "@/lib/i18n";
import { secondLang } from "@/lib/i18n-form";
import UploadField from "../../UploadField";
import { LanguagePicker } from "../../OtherLanguages";
import { SubmitButton } from "../../SubmitButton";
import { Card, Notice, PageTitle, inputCls } from "../../ui";
import { saveSettings } from "./actions";

// Always depends on the signed-in admin, so it is rendered per request.
export const instant = false;
export const metadata = { title: "Site text" };

const GROUP_LABEL: Record<string, string> = {
  org: "Organisation", page: "Inner page banner", hero: "Home banner & intro", board: "Latest orders box", home: "Home page sections", cta: "Buttons",
  stats: "Numbers", footer: "Footer", site: "Website", orders: "Orders page", officials: "Office bearers page", division: "Division labels",
  divisions: "Divisions page", women: "Women wing page", youth: "Youth page", gallery: "Gallery page", join: "Join page", content: "Content pictures", meetings: "Meetings", feed: "Feed (limits; 1 = on, 0 = off)",
  contact: "Contact details (shown in the footer)", social: "Social media links (full web address; empty ones are hidden)",
};

export default async function SettingsAdmin({ searchParams }: { searchParams: Promise<{ saved?: string; lang?: string }> }) {
  await requireAdmin(["super_admin"]);
  const sp = await searchParams;
  // The second column shows Hindi or another language chosen at the top.
  const lang2 = secondLang(sp.lang);
  const second = LANGUAGES.find((l) => l.code === lang2)!;
  const rows = await getDb().select().from(schema.siteSettings).orderBy(asc(schema.siteSettings.group), asc(schema.siteSettings.key));
  const value2 = (r: (typeof rows)[number]) => (lang2 === "hi" ? r.valueHi : r.i18n.value?.[lang2]) ?? "";
  const groups = new Map<string, typeof rows>();
  for (const r of rows) groups.set(r.group, [...(groups.get(r.group) ?? []), r]);

  return (
    <>
      <PageTitle title="Site text" sub="All headings and wording on the public website. English is required; the other languages are optional (empty text is shown in English)." />
      {sp.saved && <Notice>Saved. The public website is updated.</Notice>}
      <div className="mb-6"><LanguagePicker value={lang2} /></div>
      <form action={saveSettings} className="space-y-8">
        <input type="hidden" name="lang2" value={lang2} />
        {[...groups.entries()].map(([group, items]) => (
          <Card key={group}>
            <h2 className="font-display text-2xl font-bold">{GROUP_LABEL[group] ?? group}</h2>
            <div className="mt-5 space-y-6">
              {items.map((r) =>
                /[._]image$/.test(r.key) ? (
                  <UploadField key={r.key} name={`img:${r.key}`} label={`${r.key} (replace the photo)`} kind="image" folder="site" initial={r.valueEn ? [r.valueEn] : []} />
                ) : (
                  <div key={r.key} className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <label className="block text-sm font-semibold">
                      <span className="font-mono text-xs text-muted">{r.key}</span> · English
                      <textarea name={`en:${r.key}`} rows={r.valueEn.length > 90 ? 3 : 1} defaultValue={r.valueEn} className={inputCls} />
                    </label>
                    <label className="block text-sm font-semibold">
                      <span className="text-xs text-muted">&nbsp;</span> · {second.native}
                      <textarea name={`hi:${r.key}`} rows={value2(r).length > 90 ? 3 : 1} defaultValue={value2(r)} lang={lang2} className={inputCls} />
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
