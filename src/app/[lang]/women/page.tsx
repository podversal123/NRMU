import { notFound } from "next/navigation";
import CommitteeSection from "@/components/CommitteeSection";
import PageHero from "@/components/PageHero";
import { ActivityList, CommitteeLinks, WingHeading, WingIntro } from "@/components/WingParts";
import { isLang } from "@/lib/i18n";
import { getCommittee, getPages, getPostsByCategory } from "@/lib/content";
import { getSettings, setting, getUi } from "@/lib/queries";
import { navTitle } from "@/lib/nav";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return { title: isLang(lang) ? await navTitle(lang, "/women") : undefined };
}

export default async function WomenPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const ui = await getUi(lang);
  const s = await getSettings();
  const t = (k: string) => setting(s, k, lang);
  const [pages, posts, title, committee] = await Promise.all([
    getPages(setting(s, "config.women.page_pattern", lang)),
    getPostsByCategory(setting(s, "config.women.category", lang), 24),
    navTitle(lang, "/women"),
    getCommittee("women"),
  ]);

  return (
    <>
      <PageHero lang={lang} title={title} crumbs={[{ href: `/${lang}`, label: ui.home }, { label: title }]} />
      <WingIntro sub={t("women.sub")} />
      <div className="mx-auto max-w-wrap space-y-16 px-5 pb-12 pt-8 sm:px-8 sm:pb-14">
        <CommitteeSection people={committee} lang={lang} title={t("wings.committee_title")} centralLabel={t("wings.central")} pending={t("wings.committee_pending")} callLabel={ui.call} />
        {pages.length > 0 && (
          <section id="committees" className="scroll-mt-28">
            <WingHeading title={t("women.pages_title")} count={pages.length} />
            <CommitteeLinks pages={pages} lang={lang} base="women" />
          </section>
        )}
        {posts.length > 0 && (
          <section id="reports" className="scroll-mt-28">
            <WingHeading title={t("women.posts_title")} count={posts.length} />
            <ActivityList rows={posts} lang={lang} />
          </section>
        )}
      </div>
    </>
  );
}
