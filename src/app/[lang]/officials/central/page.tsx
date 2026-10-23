import { notFound } from "next/navigation";
import PageHero from "@/components/PageHero";
import PersonCard from "@/components/PersonCard";
import { getOfficeBearerParts } from "@/lib/content";
import { isLang } from "@/lib/i18n";
import { navTitle } from "@/lib/nav";
import { getSettings, getUi, setting } from "@/lib/queries";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  return { title: (await navTitle(lang, "/officials/central")) || setting(await getSettings(), "officials.card.central", lang) };
}

export default async function CentralOfficeBearers({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const [ui, s, parent, own, parts] = await Promise.all([getUi(lang), getSettings(), navTitle(lang, "/officials"), navTitle(lang, "/officials/central"), getOfficeBearerParts()]);
  const title = own || setting(s, "officials.card.central", lang);
  return (
    <>
      <PageHero
        lang={lang}
        title={title}
        sub={setting(s, "officials.central.sub", lang)}
        crumbs={[{ href: `/${lang}`, label: ui.home }, { href: `/${lang}/officials`, label: parent }, { label: title }]}
      />
      <div className="mx-auto max-w-wrap px-5 py-12 sm:px-8 sm:py-14">
        {parts.central.length ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {parts.central.map((p) => (
              <PersonCard key={p.id} p={p} lang={lang} callLabel={ui.call} />
            ))}
          </div>
        ) : (
          <p className="text-muted">{setting(s, "officials.pending", lang)}</p>
        )}
      </div>
    </>
  );
}
