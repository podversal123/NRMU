import { notFound } from "next/navigation";
import PageHero from "@/components/PageHero";
import PostGrid from "@/components/PostGrid";
import { isLang } from "@/lib/i18n";
import { getPostsByCategory } from "@/lib/content";
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
  const [posts, title] = await Promise.all([getPostsByCategory(setting(s, "config.youth.category", lang), 60), navTitle(lang, "/youth")]);
  return (
    <>
      <PageHero lang={lang} title={title} sub={setting(s, "youth.sub", lang)} crumbs={[{ href: `/${lang}`, label: ui.home }, { label: title }]} />
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        {posts.length ? <PostGrid rows={posts} lang={lang} /> : <p className="text-muted">{ui.noItems}</p>}
      </div>
    </>
  );
}
