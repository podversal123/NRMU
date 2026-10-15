import { EXTRA_LANGUAGES, LANGUAGES, isRtl, type I18n, type Lang } from "@/lib/i18n";
import { inputCls } from "./ui";

/** Chooses the language of the second column on pages that list many texts (site text, menus). */
export function LanguagePicker({ value }: { value: Lang }) {
  return (
    <form method="get" className="flex flex-wrap items-center gap-3 text-sm font-semibold">
      <label htmlFor="second-lang">Second column language</label>
      <select id="second-lang" name="lang" defaultValue={value} className="rounded-lg border-2 border-line bg-white px-3 py-2 text-base focus:border-ink focus:outline-none">
        {LANGUAGES.filter((l) => l.code !== "en").map((l) => (
          <option key={l.code} value={l.code}>
            {l.name} · {l.native}
          </option>
        ))}
      </select>
      <button className="rounded-full border-2 border-ink px-5 py-2 hover:bg-ink hover:text-white">Show</button>
    </form>
  );
}

export type I18nField = { name: string; label: string; rows?: number; mono?: boolean };

/**
 * The fields of a form in every language other than English and Hindi, folded away under one heading.
 * Inputs are named `<prefix>i18n:<field>:<lang>` and read back with `readI18n`. An empty box means the
 * English text is shown in that language.
 */
export default function OtherLanguages({ fields, value, prefix = "", className = "" }: { fields: I18nField[]; value?: I18n | null; prefix?: string; className?: string }) {
  const filled = EXTRA_LANGUAGES.filter((l) => fields.some((f) => value?.[f.name]?.[l.code])).length;
  return (
    <details className={`rounded-lg border-2 border-line bg-paper/40 ${className}`}>
      <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold">
        Other languages{" "}
        <span className="font-normal text-muted">
          ({filled} of {EXTRA_LANGUAGES.length} filled. Optional: an empty language shows the English text.)
        </span>
      </summary>
      <div className={`grid gap-4 border-t border-line p-4 ${fields.length === 1 && !fields[0].rows ? "sm:grid-cols-2 lg:grid-cols-3" : "lg:grid-cols-2"}`}>
        {EXTRA_LANGUAGES.map((l) =>
          fields.length === 1 ? (
            <Input key={l.code} field={fields[0]} lang={l.code} label={`${l.name} · ${l.native}`} value={value} prefix={prefix} />
          ) : (
            <fieldset key={l.code} className="space-y-3 border border-line bg-white p-3">
              <legend className="px-1 text-sm font-bold">
                {l.name} · <span lang={l.code}>{l.native}</span>
              </legend>
              {fields.map((f) => (
                <Input key={f.name} field={f} lang={l.code} label={f.label} value={value} prefix={prefix} />
              ))}
            </fieldset>
          ),
        )}
      </div>
    </details>
  );
}

function Input({ field, lang, label, value, prefix }: { field: I18nField; lang: (typeof EXTRA_LANGUAGES)[number]["code"]; label: string; value?: I18n | null; prefix: string }) {
  const props = {
    name: `${prefix}i18n:${field.name}:${lang}`,
    defaultValue: value?.[field.name]?.[lang] ?? "",
    lang,
    dir: isRtl(lang) ? ("rtl" as const) : undefined,
    className: `${inputCls} ${field.mono ? "font-mono text-base lg:text-sm" : ""}`,
  };
  return (
    <label className="block text-sm font-semibold">
      {label}
      {field.rows ? <textarea rows={field.rows} {...props} /> : <input {...props} />}
    </label>
  );
}
