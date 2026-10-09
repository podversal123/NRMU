import PersonCard from "@/components/PersonCard";
import type { CommitteePerson } from "@/lib/content";
import type { Lang } from "@/lib/i18n";
import { pick } from "@/lib/queries";

/** The committee of a wing: central members first, then the members of each division. Says so plainly when the list is not there yet. */
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
    if (!g) groups.push((g = { key, label: p.divisionId ? pick(lang, p.divisionEn, p.divisionHi) : centralLabel, rows: [] }));
    g.rows.push(p);
  }
  return (
    <section>
      <div className="track-red mb-5 w-24" />
      <h2 className="text-2xl font-medium">{title}</h2>
      {groups.length ? (
        <div className="mt-6 space-y-10">
          {groups.map((g) => (
            <div key={g.key}>
              {groups.length > 1 && <h3 className="mb-4 text-lg font-semibold text-muted">{g.label}</h3>}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {g.rows.map((p) => (
                  <PersonCard key={p.id} p={p} lang={lang} callLabel={callLabel} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-muted">{pending}</p>
      )}
    </section>
  );
}
