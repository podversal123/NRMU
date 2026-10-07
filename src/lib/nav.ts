import { getNav, pick } from "./queries";
import type { Lang } from "./i18n";

/** Title of a section, taken from the navigation items managed in the database. */
export async function navTitle(lang: Lang, href: string) {
  const items = await getNav("header");
  const it = items.find((n) => n.href === href);
  return it ? pick(lang, it.labelEn, it.labelHi) : "";
}
