import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import UploadField from "../../../UploadField";
import { DeleteButton, SubmitButton } from "../../../SubmitButton";
import { Card, Field, Notice, PageTitle, inputCls } from "../../../ui";
import { deletePost, savePost } from "../actions";

// Always depends on the signed-in admin, so it is rendered per request.
export const instant = false;
export const metadata = { title: "Edit order / news" };

export default async function EditPost({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin(["super_admin", "editor"]);
  const { id } = await params;
  const sp = await searchParams;
  const isNew = id === "new";
  if (!isNew && !/^\d+$/.test(id)) notFound();
  const db = getDb();

  const [post] = isNew ? [] : await db.select().from(schema.posts).where(eq(schema.posts.id, Number(id))).limit(1);
  if (!isNew && !post) notFound();
  const [cats, linked, files] = await Promise.all([
    db.select().from(schema.categories).orderBy(asc(schema.categories.sort)),
    isNew ? [] : db.select().from(schema.postCategories).where(eq(schema.postCategories.postId, Number(id))),
    isNew ? [] : db.select().from(schema.postFiles).where(eq(schema.postFiles.postId, Number(id))).orderBy(asc(schema.postFiles.sort)),
  ]);
  const selected = new Set(linked.map((l) => l.categoryId));
  const byId = new Map(cats.map((c) => [c.id, c]));
  const depth = (c: (typeof cats)[number]) => { let d = 0; let cur = c; while (cur.parentId && byId.get(cur.parentId)) { d++; cur = byId.get(cur.parentId)!; } return d; };
  const ordered = [...cats].sort((a, b) => a.nameEn.localeCompare(b.nameEn));

  return (
    <>
      <PageTitle title={isNew ? "Add order / news" : "Edit order / news"} action={<Link href="/admin/posts" className="inline-block py-2 text-sm font-semibold text-brand">← All items</Link>} />
      {sp.saved && <Notice>Saved. The public website is updated.</Notice>}
      {sp.error === "title" && <Notice kind="err">Please enter a title.</Notice>}
      <form action={savePost} className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <input type="hidden" name="id" value={isNew ? "" : id} />
        <Card className="space-y-5">
          <Field label="Title (English)"><input name="titleEn" required defaultValue={post?.titleEn} className={inputCls} /></Field>
          <Field label="Title (Hindi)" hint="Optional. If empty, the English title is shown on the Hindi site."><input name="titleHi" defaultValue={post?.titleHi ?? ""} className={inputCls} /></Field>
          <Field label="Content" hint="Type plain text (blank line = new paragraph) or paste HTML.">
            <textarea name="content" rows={16} defaultValue={post?.contentHtml} className={`${inputCls} font-mono text-base lg:text-sm`} />
          </Field>
          <UploadField name="files" label="Attachments (PDF, Word, Excel, images)" kind="any" multiple folder="orders" initial={files.map((f) => f.url)} />
        </Card>
        <div className="space-y-6">
          <Card className="space-y-5">
            <Field label="Date"><input type="date" name="date" defaultValue={post?.publishedAt ?? new Date().toISOString().slice(0, 10)} className={inputCls} /></Field>
            <Field label="Status">
              <select name="status" defaultValue={post?.status ?? "published"} className={inputCls}>
                <option value="published">Published (visible on website)</option>
                <option value="draft">Draft (hidden)</option>
              </select>
            </Field>
            <Field label="Categories" hint="Hold Ctrl (or Cmd) to select several.">
              <select name="categories" multiple size={12} defaultValue={[...selected].map(String)} className={inputCls}>
                {ordered.map((c) => <option key={c.id} value={c.id}>{"– ".repeat(depth(c))}{c.nameEn}</option>)}
              </select>
            </Field>
            <SubmitButton className="btn-primary w-full px-6 py-3">Save</SubmitButton>
          </Card>
        </div>
      </form>
      {!isNew && (
        <form action={deletePost} className="mt-6">
          <input type="hidden" name="id" value={id} />
          <DeleteButton label="Delete this item" confirmText="Delete this item permanently? This cannot be undone." />
        </form>
      )}
    </>
  );
}
