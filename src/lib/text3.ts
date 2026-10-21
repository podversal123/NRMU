import type { Lang } from "./i18n";
import { noEmDash } from "./text";

/** A name kept in English, Hindi and the other languages (`tr`), as rows of the database carry it. Safe to send to the browser. */
export type Text3 = { en: string; hi: string | null; tr?: Partial<Record<string, string>> | null };

/** The text for the visitor's language, falling back to English; the browser-side twin of `pick` in lib/queries. */
export const pickText = (lang: Lang, t: Text3 | null | undefined) => (t ? noEmDash((lang === "en" ? t.en : lang === "hi" ? t.hi : t.tr?.[lang]) || t.en) : "");

/** Puts values into wording from the database: fill("{n} likes", { n: 3 }) gives "3 likes". Unknown names are left as they are. */
export const fill = (s: string, vars: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
