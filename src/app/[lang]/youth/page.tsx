import { notFound } from "next/navigation";
import CommitteeSection from "@/components/CommitteeSection";
import PageHero from "@/components/PageHero";
import { ActivityList, WingEmpty, WingHeading, WingIntro } from "@/components/WingParts";
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
      <PageHero lang={lang} title={title} crumbs={[{ href: `/${lang}`, label: ui.home }, { label: title }]} />
      <WingIntro sub={t("youth.sub")} />
      <div className="mx-auto max-w-wrap space-y-16 px-5 pb-12 pt-8 sm:px-8 sm:pb-14">
        <CommitteeSection people={committee} lang={lang} title={t("wings.committee_title")} centralLabel={t("wings.central")} pending={t("wings.committee_pending")} callLabel={ui.call} />
        <section id="reports" className="scroll-mt-28">
          <WingHeading title={t("wings.reports_title")} count={posts.length || undefined} />
          {posts.length ? <ActivityList rows={posts} lang={lang} /> : <WingEmpty text={ui.noItems} />}
        </section>
      </div>
    </>
  );
}
