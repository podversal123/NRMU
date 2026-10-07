import { NextResponse, type NextRequest } from "next/server";
import { eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";

/**
 * Resolves addresses from the old WordPress website to the new ones (permanent redirects):
 *   /2016/06/26/post-name/        -> /en/orders/<id>
 *   /category/a/b/                -> /en/orders?cat=b
 *   /delhi-division/              -> /en/divisions/delhi
 *   /central-office-bearers/      -> /en/officials
 *   /some-page-slug/              -> /en/pages/some-page-slug
 * Anything else is treated as an address typed without a language and sent to /en/<address>.
 */
export async function GET(request: NextRequest) {
  const raw = request.nextUrl.pathname.replace(/^\/legacy/, "") || "/";
  const path = decodeURIComponent(raw).replace(/\/+$/, "");
  const lang = request.cookies.get("nrmu-lang")?.value === "hi" ? "hi" : "en";
  const to = (p: string) => NextResponse.redirect(new URL(`/${lang}${p}`, request.url), 301);
  const db = getDb();

  // old post address
  const dated = path.match(/^\/\d{4}\/\d{2}\/\d{2}\/([^/]+)$/);
  if (dated) {
    const [p] = await db.select({ id: schema.posts.id }).from(schema.posts).where(eq(schema.posts.slug, dated[1])).limit(1);
    if (p) return to(`/orders/${p.id}`);
  }

  // old category address (the last segment is the category)
  if (path.startsWith("/category/")) {
    const slug = path.split("/").filter(Boolean).pop()!;
    const [c] = await db.select({ slug: schema.categories.slug }).from(schema.categories).where(eq(schema.categories.slug, slug)).limit(1);
    return to(c ? `/orders?cat=${c.slug}` : "/orders");
  }

  // single-segment addresses: divisions and static pages
  const single = path.match(/^\/([^/]+)$/);
  if (single) {
    const slug = single[1];
    const [d] = await db.select({ slug: schema.divisions.slug }).from(schema.divisions).where(eq(schema.divisions.legacySlug, slug)).limit(1);
    if (d) return to(`/divisions/${d.slug}`);

    const [cat] = await db.select({ slug: schema.categories.slug }).from(schema.categories).where(eq(schema.categories.slug, slug)).limit(1);
    if (cat) return to(`/orders?cat=${cat.slug}`);

    const [pg] = await db.select({ slug: schema.pages.slug }).from(schema.pages).where(eq(schema.pages.slug, slug)).limit(1);
    if (pg) {
      if (/^(central-office-bearers|divisional-president|divisional-secretaries)$/.test(pg.slug)) return to("/officials");
      return to(`/pages/${pg.slug}`);
    }
    // a post that was published as a page-like address
    const [p] = await db.select({ id: schema.posts.id }).from(schema.posts).where(eq(schema.posts.slug, slug)).limit(1);
    if (p) return to(`/orders/${p.id}`);
  }
  void sql;
  return to(path);
}
