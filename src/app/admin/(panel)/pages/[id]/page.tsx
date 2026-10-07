import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { SubmitButton } from "../../../SubmitButton";
import { Card, Field, Notice, PageTitle, inputCls } from "../../../ui";
import { savePage } from "../actions";

export const metadata = { title: "Edit page" };

export default async function EditPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin(["super_admin", "editor"]);
  const { id } = await params;
  const sp = await searchParams;
  if (!/^\d+$/.test(id)) notFound();
  const [p] = await getDb().select().from(schema.pages).where(eq(schema.pages.id, Number(id))).limit(1);
  if (!p) notFound();
  return (
    <>
      <PageTitle title={p.titleEn} action={<Link href="/admin/pages" className="text-sm font-semibold text-brand">← All pages</Link>} />
      {sp.saved && <Notice>Saved. The public website is updated.</Notice>}
      {sp.error && <Notice kind="err">Title is required.</Notice>}
      <form action={savePage} className="space-y-6">
        <input type="hidden" name="id" value={p.id} />
        <Card className="grid gap-5 sm:grid-cols-2">
          <Field label="Title (English)"><input name="titleEn" required defaultValue={p.titleEn} className={inputCls} /></Field>
          <Field label="Title (Hindi)"><input name="titleHi" defaultValue={p.titleHi ?? ""} className={inputCls} /></Field>
        </Card>
        <Card className="space-y-5">
          <Field label="Content (English)" hint="Plain text (blank line = new paragraph) or HTML."><textarea name="content" rows={16} defaultValue={p.contentHtml} className={`${inputCls} font-mono text-sm`} /></Field>
          <Field label="Content (Hindi)" hint="Optional. If empty, English content is shown on the Hindi site."><textarea name="contentHi" rows={10} defaultValue={p.contentHtmlHi ?? ""} className={`${inputCls} font-mono text-sm`} /></Field>
          <SubmitButton>Save</SubmitButton>
        </Card>
      </form>
    </>
  );
}
