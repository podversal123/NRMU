import OfficeList from "@/components/OfficeList";
import PersonCard from "@/components/PersonCard";
import { WingEmpty, WingHeading } from "@/components/WingParts";
import type { CommitteePerson } from "@/lib/content";
import type { Lang } from "@/lib/i18n";
import { pick } from "@/lib/queries";

/**
 * The committee of a wing: central members first, then the members of each division, as cards; a division's
 * branch members follow its cards as a plain list, since there can be dozens. Says so plainly when the list is
 * not there yet.
 */
export default function CommitteeSection({
  people,
  lang,
  title,
  centralLabel,
  pending,
  callLabel,
}: {
  people: CommitteePerson[];
  lang: Lang;
  title: string;
  centralLabel: string;
  pending: string;
  callLabel: string;
}) {
  const groups: { key: string; label: string; rows: CommitteePerson[] }[] = [];
  for (const p of people) {
    const key = p.divisionId ? String(p.divisionId) : "central";
    let g = groups.find((x) => x.key === key);
    if (!g) groups.push((g = { key, label: p.divisionId ? pick(lang, p.divisionEn, p.divisionHi, p.divisionI18n?.name) : centralLabel, rows: [] }));
    g.rows.push(p);
  }
  // id: the menu links to this section (/women#committee, /youth#committee); the margin keeps it clear of the sticky header
  return (
    <section id="committee" className="scroll-mt-28">
      <WingHeading title={title} count={people.length || undefined} />
      {groups.length ? (
        <div className="space-y-10">
          {groups.map((g) => (
            <div key={g.key}>
              {groups.length > 1 && <h3 className="mb-4 text-lg font-semibold text-muted">{g.label}</h3>}
              {g.rows.some((p) => !p.branchName) && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {g.rows
                    .filter((p) => !p.branchName)
                    .map((p) => (
                      <PersonCard key={p.id} p={p} lang={lang} callLabel={callLabel} />
                    ))}
                </div>
              )}
              {g.rows.some((p) => p.branchName) && (
                <div className={`overflow-hidden rounded-xl border border-line bg-white px-4 shadow-[0_2px_10px_-4px_rgba(111,26,23,0.18)] sm:px-5 ${g.rows.some((p) => !p.branchName) ? "mt-4" : ""}`}>
                  <OfficeList people={g.rows.filter((p) => p.branchName)} lang={lang} callLabel={callLabel} columns />
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <WingEmpty text={pending} />
      )}
    </section>
  );
}
