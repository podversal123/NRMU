import Link from "next/link";
import type { Lang } from "@/lib/i18n";
import { getUi } from "@/lib/queries";

/**
 * Top of every inner page: a slim breadcrumb and the page title, on the plain page background with no band
 * or picture, so the content starts right away. `sub` is accepted for the callers but not shown.
 */
export default async function PageHero({
  lang,
  title,
  crumbs,
}: {
  lang: Lang;
  title: string;
  sub?: string;
  crumbs?: { href?: string; label: string }[];
}) {
  const ui = await getUi(lang);
  return (
    <div className="mx-auto max-w-wrap px-5 pt-6 sm:px-8 sm:pt-8">
      {crumbs && (
        <nav aria-label={ui.breadcrumb} className="flex flex-wrap items-center gap-1.5 text-sm text-muted">
          {crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {c.href ? (
                <Link href={c.href} className="-mx-1 -my-2 inline-block px-1 py-2 hover:text-brand hover:underline">
                  {c.label}
                </Link>
              ) : (
                <span className="max-w-[20rem] truncate text-ink">{c.label}</span>
              )}
              {i < crumbs.length - 1 && <span aria-hidden>/</span>}
            </span>
          ))}
        </nav>
      )}
      <h1 className="mt-3 text-[1.6rem] font-bold leading-tight text-ink md:text-[1.85rem]">{title}</h1>
    </div>
  );
}
