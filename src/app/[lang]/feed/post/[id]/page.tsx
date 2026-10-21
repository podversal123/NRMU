import { notFound } from "next/navigation";
import { Suspense } from "react";
import PageFallback from "@/components/PageFallback";
import PageHero from "@/components/PageHero";
import FeedCard from "@/components/feed/FeedCard";
import { cardText, feedLabels } from "@/components/feed/labels";
import { feedConfig, getFeedState, getMemberPost } from "@/lib/feed";
import { isLang, type Lang } from "@/lib/i18n";
import { getMember } from "@/lib/member-auth";
import { visitorHash } from "@/lib/visitor";
import { navTitle } from "@/lib/nav";
import { getSettings, getUi, setting } from "@/lib/queries";

type Props = { params: Promise<{ lang: string; id: string }> };

export async function generateMetadata({ params }: Props) {
  const { lang, id } = await params;
  if (!isLang(lang) || !/^\d+$/.test(id)) return {};
  const post = await getMemberPost(Number(id));
  return post && post.target === "member" ? { title: post.body.slice(0, 60), robots: { index: false, follow: true } } : {};
}

/** One approved member post on its own page, with its comments open. Linked from the feed and from notifications. */
export default function MemberPostPage({ params }: Props) {
  return (
    <Suspense fallback={<PageFallback />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: Props) {
  const { lang, id } = await params;
  if (!isLang(lang) || !/^\d{1,9}$/.test(id)) notFound();
  const post = await getMemberPost(Number(id));
  if (!post) notFound();
  const [ui, s, cfg, member, feedTitle] = await Promise.all([getUi(lang as Lang), getSettings(), feedConfig(), getMember(), navTitle(lang as Lang, "/feed")]);
  const state = await getFeedState([post], member?.id ?? null, member ? null : await visitorHash());

  return (
    <>
      <PageHero lang={lang as Lang} title={feedTitle} crumbs={[{ href: `/${lang}`, label: ui.home }, { href: `/${lang}/feed`, label: feedTitle }, { label: ui.fdViewPost }]} />
      <div className="mx-auto max-w-2xl px-5 py-8 sm:px-8 sm:py-10">
        <FeedCard lang={lang as Lang} item={post} state={state} me={member?.id ?? null} text={cardText(ui, setting(s, "org.short", lang as Lang))} labels={feedLabels(ui)} commentMax={cfg.commentMax} guestLikes={cfg.guestLikes} open />
      </div>
    </>
  );
}
