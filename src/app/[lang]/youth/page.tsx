import { notFound } from "next/navigation";
import CommitteeSection from "@/components/CommitteeSection";
import PageHero from "@/components/PageHero";
import PostGrid from "@/components/PostGrid";
import { isLang } from "@/lib/i18n";
import { getCommittee, getPostsByCategory } from "@/lib/content";
import { getSettings, setting, getUi } from "@/lib/queries";
import { navTitle } from "@/lib/nav";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return { title: isLang(lang) ? await navTitle(lang, "/youth") : undefined };
}

export default async function YouthPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const ui = await getUi(lang);
  const s = await getSettings();
  const [posts, title, committee] = await Promise.all([getPostsByCategory(setting(s, "config.youth.category", lang), 60), navTitle(lang, "/youth"), getCommittee("youth")]);
  const t = (k: string) => setting(s, k, lang);
  return (
    <>
      <PageHero lang={lang} title={title} sub={setting(s, "youth.sub", lang)} crumbs={[{ href: `/${lang}`, label: ui.home }, { label: title }]} />
      <div className="mx-auto max-w-wrap space-y-16 px-5 py-14 sm:px-8">
        <CommitteeSection people={committee} lang={lang} title={t("wings.committee_title")} centralLabel={t("wings.central")} pending={t("wings.committee_pending")} callLabel={ui.call} />
        <section>
          <div className="track-red mb-5 w-24" />
          <h2 className="text-2xl font-medium">{t("wings.reports_title")}</h2>
          <div className="mt-6">{posts.length ? <PostGrid rows={posts} lang={lang} /> : <p className="text-muted">{ui.noItems}</p>}</div>
        </section>
      </div>
    </>
  );
}
