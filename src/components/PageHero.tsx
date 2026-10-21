import Breadcrumb from "@/components/Breadcrumb";
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
      {crumbs && <Breadcrumb label={ui.breadcrumb} crumbs={crumbs} />}
      <h1 className="mt-3 text-[1.6rem] font-bold leading-tight text-ink md:text-[1.85rem]">{title}</h1>
    </div>
  );
}
