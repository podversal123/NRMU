import { getNav, pick } from "./queries";
import type { Lang } from "./i18n";

/** Title of a section, taken from the navigation items managed in the database. A section taken out of the menu keeps its title. */
export async function navTitle(lang: Lang, href: string) {
  const items = await getNav("header", true);
  const it = items.find((n) => n.href === href && n.active) ?? items.find((n) => n.href === href);
  return it ? pick(lang, it.labelEn, it.labelHi, it.i18n?.label) : "";
}
