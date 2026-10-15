import { sql, type AnyColumn, type SQL } from "drizzle-orm";
import { EXTRA_LANGUAGES, isLang, type ExtraLang, type I18n, type Lang } from "./i18n";
import { noEmDash } from "./text";

/** The language of the second column on admin pages that show one other language at a time (Hindi unless chosen). */
export const secondLang = (v: string | undefined): Exclude<Lang, "en"> => (v && isLang(v) && v !== "en" ? v : "hi");

/** New value of an `i18n` column with one field in one language set (or removed when `value` is empty). */
export function setOneLang(column: AnyColumn, field: string, lang: ExtraLang, value: string): SQL {
  const texts = sql`coalesce(${column} -> ${field}, '{}'::jsonb)`;
  const next = value ? sql`${texts} || jsonb_build_object(${lang}::text, ${noEmDash(value)}::text)` : sql`${texts} - ${lang}::text`;
  return sql`jsonb_set(${column}, array[${field}::text], ${next})`;
}

/**
 * Reads the boxes made by the admin's `OtherLanguages` block into the value of an `i18n` column.
 * `fields` maps each field name to its longest allowed length; `clean` can rework a value (for example to sanitise HTML).
 * Empty boxes are left out, so that language shows the English text. Every field gets a key (even when empty),
 * so a form that saves only some fields can be merged into the stored value (`i18n || new`) without losing the others.
 */
export function readI18n(form: FormData, fields: Record<string, number>, prefix = "", clean: (field: string, v: string) => string = (_f, v) => v): I18n {
  const out: I18n = {};
  for (const [field, max] of Object.entries(fields)) {
    const texts: NonNullable<I18n[string]> = {};
    for (const { code } of EXTRA_LANGUAGES) {
      const v = clean(field, noEmDash(String(form.get(`${prefix}i18n:${field}:${code}`) ?? "").trim().slice(0, max)));
      if (v) texts[code] = v;
    }
    out[field] = texts;
  }
  return out;
}
