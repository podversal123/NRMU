import type { Lang } from "@/lib/i18n";
import { pick } from "@/lib/queries";
import type { Person } from "./PersonCard";

/**
 * A committee as a plain list, one person a row: the name, the post with the place of work, and the phone. For
 * the long lists (a division's vice presidents and assistant secretaries, a branch's whole committee), where a
 * card for every person would make the page too long to scan.
 */
export default function OfficeList({ people, lang, callLabel, columns = false }: { people: (Person & { id: number })[]; lang: Lang; callLabel: string; columns?: boolean }) {
  // in columns, every row keeps a hairline under it and the box around the list hides the last one (overflow and -mb-px)
  return (
    <ul className={columns ? "-mb-px grid gap-x-10 md:grid-cols-2 xl:grid-cols-3" : "divide-y divide-line"}>
      {people.map((p) => (
        <li key={p.id} className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3 ${columns ? "border-b border-line" : ""}`}>
          <div className="min-w-0 break-words">
            <p className="font-semibold leading-snug">{pick(lang, p.nameEn, p.nameHi, p.i18n?.name)}</p>
            <p className="text-sm leading-snug">
              <span className="font-semibold text-brand">{pick(lang, p.designationEn, p.designationHi, p.designationI18n?.name)}</span>
              {p.placeLabel && <span className="text-muted"> · {p.placeLabel}</span>}
            </p>
          </div>
          {p.phone && (
            <a href={`tel:${p.phone.replace(/\s/g, "")}`} aria-label={`${callLabel} ${p.phone}`} className="-my-2 inline-flex min-h-11 shrink-0 items-center text-sm font-bold tabular-nums hover:text-brand">
              ☎ {p.phone}
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}
