import type { OfficePerson } from "@/lib/content";
import type { Lang } from "@/lib/i18n";
import { pick } from "@/lib/queries";
import OfficeList from "./OfficeList";

type Row = { id: number; name: string; people: OfficePerson[] };

const Chevron = () => (
  <svg viewBox="0 0 24 24" className="size-4 shrink-0 text-muted transition-transform group-open:rotate-90 rtl:rotate-180 rtl:group-open:rotate-90" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M9 6l6 6-6 6" />
  </svg>
);

/**
 * The branches of a division as one table: a line per branch with its President, its Secretary and a phone, the
 * whole committee opening under the line on a click. Every line keeps the same height whether open or not, so the
 * page reads down evenly. On phones a line stacks into a short block. A line carries `id="branch-<id>"`, so the
 * header's Divisions menu can open it (see BranchTarget).
 */
export default function BranchTable({
  rows,
  lang,
  labels,
}: {
  rows: Row[];
  lang: Lang;
  labels: { branch: string; phone: string; call: string; pending: string };
}) {
  const all = rows.flatMap((r) => r.people);
  const title = (scope: string) => {
    const p = all.find((x) => x.scope === scope);
    return p ? pick(lang, p.designationEn, p.designationHi, p.designationI18n?.name) : "";
  };
  const president = title("branch_president");
  const secretary = title("branch_secretary");
  const name = (p?: OfficePerson) => (p ? pick(lang, p.nameEn, p.nameHi, p.i18n?.name) : "");
  const grid = "md:grid md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,1fr)_9.5rem] md:items-center md:gap-5";

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white shadow-[0_2px_10px_-4px_rgba(111,26,23,0.18)]">
      <div aria-hidden className={`hidden border-b border-line bg-paper/70 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-muted ${grid}`}>
        <span className="ps-6">{labels.branch}</span>
        <span>{president}</span>
        <span>{secretary}</span>
        <span>{labels.phone}</span>
      </div>
      {rows.map((r) => {
        const pres = r.people.find((p) => p.scope === "branch_president");
        const secy = r.people.find((p) => p.scope === "branch_secretary");
        const phone = secy?.phone ?? pres?.phone ?? r.people.find((p) => p.phone)?.phone ?? null;
        return (
          <details key={r.id} id={`branch-${r.id}`} className="group scroll-mt-32 border-b border-line last:border-b-0 data-[picked]:bg-[#fbf6ec]">
            <summary className={`cursor-pointer list-none px-5 py-3.5 transition-colors hover:bg-[#fbf8f4] group-open:bg-[#fbf6ec] [&::-webkit-details-marker]:hidden ${grid}`}>
              <span className="flex items-center gap-2 font-semibold leading-snug">
                <Chevron />
                <span className="min-w-0 break-words">{r.name}</span>
              </span>
              {r.people.length === 0 ? (
                <span className="mt-1 block ps-6 text-sm text-muted md:col-span-3 md:mt-0 md:ps-0">{labels.pending}</span>
              ) : (
                <>
                  <span className="mt-1.5 block ps-6 text-[0.95rem] md:mt-0 md:ps-0">
                    <span className="me-1.5 text-xs font-semibold text-brand md:hidden">{president}:</span>
                    {name(pres) || "-"}
                  </span>
                  <span className="mt-0.5 block ps-6 text-[0.95rem] md:mt-0 md:ps-0">
                    <span className="me-1.5 text-xs font-semibold text-brand md:hidden">{secretary}:</span>
                    {name(secy) || "-"}
                  </span>
                  <span className="mt-0.5 block ps-6 md:mt-0 md:ps-0">
                    {phone ? (
                      <a href={`tel:${phone.replace(/\s/g, "")}`} aria-label={`${labels.call} ${phone}`} className="inline-flex min-h-9 items-center text-sm font-bold tabular-nums hover:text-brand">
                        ☎ {phone}
                      </a>
                    ) : (
                      <span className="text-sm text-muted">-</span>
                    )}
                  </span>
                </>
              )}
            </summary>
            {r.people.length > 0 && (
              <div className="overflow-hidden border-t border-line bg-white px-5 ps-11">
                <OfficeList people={r.people} lang={lang} callLabel={labels.call} columns />
              </div>
            )}
          </details>
        );
      })}
    </div>
  );
}
