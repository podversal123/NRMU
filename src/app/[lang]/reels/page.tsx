import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { asc, desc, eq } from "drizzle-orm";
import PageHero from "@/components/PageHero";
import { getDb, schema } from "@/db";
import { cloudinaryConfigured, reelUrls } from "@/lib/cloudinary";
import { isLang } from "@/lib/i18n";
import { getUi, pick } from "@/lib/queries";
import ReelsViewer from "./ReelsViewer";

// The list changes when the admin adds or hides a reel, so it is built for each visit.
export const instant = false;

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return { title: isLang(lang) ? (await getUi(lang)).rlTitle : undefined };
}

export default function ReelsPage({ params }: { params: Promise<{ lang: string }> }) {
  return (
    <Suspense fallback={<div className="mx-auto max-w-wrap px-5 py-20" aria-busy="true" />}>
      <Reels params={params} />
    </Suspense>
  );
}

async function Reels({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  await connection();
  const ui = await getUi(lang);
  const rows = cloudinaryConfigured()
    ? await getDb().select().from(schema.reels).where(eq(schema.reels.published, true)).orderBy(asc(schema.reels.sort), desc(schema.reels.id)).limit(50)
    : [];
  const reels = rows.map((r) => {
    const u = reelUrls(r.publicId, r.bytes);
    return { id: r.id, title: pick(lang, r.titleEn, r.titleHi, r.i18n?.title), credit: r.credit, video: u.video, poster: u.poster };
  });

  return (
    <>
      <PageHero lang={lang} title={ui.rlTitle} crumbs={[{ href: `/${lang}`, label: ui.home }, { label: ui.rlTitle }]} />
      <div className="mx-auto max-w-wrap px-5 py-6 sm:px-8 sm:py-8">
        <p className="mx-auto mb-5 max-w-md text-center text-muted">{ui.rlSub}</p>
        {reels.length ? (
          <ReelsViewer reels={reels} labels={{ soundOn: ui.rlSoundOn, soundOff: ui.rlSoundOff, hint: ui.rlHint, play: ui.rlPlay, pause: ui.rlPause, of: ui.rlOf }} />
        ) : (
          <p className="text-center text-muted">{ui.rlNone}</p>
        )}
      </div>
    </>
  );
}
