import { notFound } from "next/navigation";
import PageHero from "@/components/PageHero";
import PersonCard from "@/components/PersonCard";
import { isLang } from "@/lib/i18n";
import { getOfficials } from "@/lib/content";
import { getSettings, setting, getUi } from "@/lib/queries";
import { navTitle } from "@/lib/nav";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return { title: isLang(lang) ? await navTitle(lang, "/officials") : undefined };
}

export default async function OfficialsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const ui = await getUi(lang);
  const [people, s, title] = await Promise.all([getOfficials(), getSettings(), navTitle(lang, "/officials")]);

  const groups = [
    { key: "central", rows: people.filter((p) => p.scope === "central") },
    { key: "division_president", rows: people.filter((p) => p.scope === "division_president") },
    { key: "division_secretary", rows: people.filter((p) => p.scope === "division_secretary") },
  ].filter((g) => g.rows.length);

  return (
    <>
      <PageHero lang={lang} title={title} sub={setting(s, "officials.sub", lang)} crumbs={[{ href: `/${lang}`, label: ui.home }, { label: title }]} />
      <div className="mx-auto max-w-7xl space-y-16 px-4 py-14 sm:px-6">
        {groups.map((g) => (
          <section key={g.key}>
            <div className="track-red mb-5 w-24" />
            <h2 className="font-display text-2xl font-semibold sm:text-2xl">{setting(s, `officials.group.${g.key}`, lang)}</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {g.rows.map((p) => (
                <PersonCard key={p.id} p={p} lang={lang} callLabel={ui.call} />
              ))}
            </div>
          </section>
        ))}
        {groups.length === 0 && <p className="text-muted">{ui.noItems}</p>}
      </div>
    </>
  );
}
