import Link from "next/link";
import { notFound } from "next/navigation";
import CommitteeSection from "@/components/CommitteeSection";
import Icon from "@/components/Icon";
import PageHero from "@/components/PageHero";
import PostGrid from "@/components/PostGrid";
import { isLang } from "@/lib/i18n";
import { getCommittee, getPages, getPostsByCategory } from "@/lib/content";
import { getSettings, pick, setting, getUi } from "@/lib/queries";
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
  const [pages, posts, title, committee] = await Promise.all([
    getPages(setting(s, "config.women.page_pattern", lang)),
    getPostsByCategory(setting(s, "config.women.category", lang), 24),
    navTitle(lang, "/women"),
    getCommittee("women"),
  ]);

  return (
    <>
      <PageHero lang={lang} title={title} sub={setting(s, "women.sub", lang)} crumbs={[{ href: `/${lang}`, label: ui.home }, { label: title }]} />
      <div className="mx-auto max-w-wrap space-y-16 px-5 py-14 sm:px-8">
        <CommitteeSection people={committee} lang={lang} title={setting(s, "wings.committee_title", lang)} centralLabel={setting(s, "wings.central", lang)} pending={setting(s, "wings.committee_pending", lang)} callLabel={ui.call} />
        {pages.length > 0 && (
          <section>
            <div className="track-red mb-5 w-24" />
            <h2 className="font-display text-2xl font-semibold sm:text-2xl">{setting(s, "women.pages_title", lang)}</h2>
            <ul className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {pages.map((p) => (
                <li key={p.slug} className="min-w-0">
                  <Link href={`/${lang}/women/${p.slug}`} className="group flex items-center gap-4 rounded-none border border-line bg-white p-5 transition hover:border-ink">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-none bg-ink text-signal group-hover:bg-brand group-hover:text-white">
                      <Icon name="people" />
                    </span>
                    <span className="min-w-0 break-words font-display font-bold leading-snug">{pick(lang, p.titleEn, p.titleHi)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
        {posts.length > 0 && (
          <section>
            <div className="track-red mb-5 w-24" />
            <h2 className="font-display text-2xl font-semibold sm:text-2xl">{setting(s, "women.posts_title", lang)}</h2>
            <div className="mt-6">
              <PostGrid rows={posts} lang={lang} photos />
            </div>
          </section>
        )}
      </div>
    </>
  );
}
