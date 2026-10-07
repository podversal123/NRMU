"use server";

import { eq, inArray, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { getDb, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { htmlToText, slugify, toHtml } from "@/lib/text";

const str = (f: FormData, k: string, max = 500) => String(f.get(k) ?? "").trim().slice(0, max);

export async function savePost(form: FormData) {
  await requireAdmin(["super_admin", "editor"]);
  const db = getDb();
  const idRaw = str(form, "id", 12);
  const titleEn = str(form, "titleEn", 500);
  if (!titleEn) redirect(`/admin/posts/${idRaw || "new"}?error=title`);

  const html = toHtml(String(form.get("content") ?? ""));
  const text = htmlToText(html);
  const files = form.getAll("files").map(String).filter((u) => /^https:\/\//.test(u));
  const img = html.match(/<img[^>]+src="([^"]+)"/i)?.[1] ?? files.find((u) => /\.(jpe?g|png|webp|gif)$/i.test(u)) ?? null;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(str(form, "date", 10)) ? str(form, "date", 10) : new Date().toISOString().slice(0, 10);
  const status = str(form, "status", 12) === "draft" ? "draft" : "published";
  const catIds = form.getAll("categories").map(Number).filter(Boolean);

  const values = {
    titleEn,
    titleHi: str(form, "titleHi", 500) || null,
    excerpt: text.slice(0, 220),
    contentHtml: html,
    bodyText: text.slice(0, 30000),
    publishedAt: date,
    thumbUrl: img,
    status,
    updatedAt: new Date(),
  };

  let id = Number(idRaw);
  if (id) {
    await db.update(schema.posts).set(values).where(eq(schema.posts.id, id));
  } else {
    const [{ next }] = (await db.execute(sql`select coalesce(max(id), 0) + 1 as next from posts`)).rows as { next: number }[];
    id = Number(next);
    await db.insert(schema.posts).values({ ...values, id, slug: `${slugify(titleEn) || "post"}-${id}` });
  }

  await db.delete(schema.postFiles).where(eq(schema.postFiles.postId, id));
  if (files.length) {
    await db.insert(schema.postFiles).values(
      files.map((url, i) => ({
        postId: id,
        url,
        name: decodeURIComponent(url.split("/").pop() ?? "").replace(/\.[A-Za-z0-9]+$/, "").replace(/[-_]+/g, " ").trim() || null,
        kind: /\.pdf$/i.test(url) ? "pdf" : /\.(docx?|rtf)$/i.test(url) ? "doc" : /\.(xlsx?|csv)$/i.test(url) ? "sheet" : /\.(jpe?g|png|gif|webp)$/i.test(url) ? "image" : "file",
        sort: i,
      })),
    );
  }

  await db.delete(schema.postCategories).where(eq(schema.postCategories.postId, id));
  if (catIds.length) {
    await db.insert(schema.postCategories).values(catIds.map((c) => ({ postId: id, categoryId: c }))).onConflictDoNothing();
  }

  updateTag("posts");
  updateTag(`post-${id}`);
  redirect(`/admin/posts/${id}?saved=1`);
}

export async function deletePost(form: FormData) {
  await requireAdmin(["super_admin", "editor"]);
  const id = Number(form.get("id"));
  if (id) {
    await getDb().delete(schema.posts).where(inArray(schema.posts.id, [id]));
    updateTag("posts");
    updateTag(`post-${id}`);
  }
  redirect("/admin/posts?deleted=1");
}
