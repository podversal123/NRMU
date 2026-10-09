import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import PageFallback from "@/components/PageFallback";
import PageHero from "@/components/PageHero";
import PhotoGrid from "@/components/PhotoGrid";
import { getGalleryAlbum } from "@/lib/content";
import { isLang } from "@/lib/i18n";
import { navTitle } from "@/lib/nav";
import { formatDate, getSettings, getUi, pick, setting } from "@/lib/queries";

type Props = { params: Promise<{ lang: string; id: string }> };

export async function generateMetadata({ params }: Props) {
  const { lang, id } = await params;
  if (!isLang(lang) || !/^\d+$/.test(id)) return {};
  const data = await getGalleryAlbum(Number(id));
  return data ? { title: pick(lang, data.album.titleEn, data.album.titleHi) } : {};
}

export default function AlbumPage({ params }: Props) {
  return (
    <Suspense fallback={<PageFallback />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: Props) {
  const { lang, id } = await params;
  if (!isLang(lang) || !/^\d+$/.test(id)) notFound();
  const data = await getGalleryAlbum(Number(id));
  if (!data) notFound();
  const [ui, s, parent] = await Promise.all([getUi(lang), getSettings(), navTitle(lang, "/gallery")]);
  const { album, photos } = data;
  const title = pick(lang, album.titleEn, album.titleHi);
  const place = [pick(lang, album.divisionEn, album.divisionHi), pick(lang, album.branchEn, album.branchHi)].filter(Boolean).join(" · ") || setting(s, "gallery.whole_union", lang);
  const about = pick(lang, album.descriptionEn, album.descriptionHi);
  return (
    <>
      <PageHero lang={lang} title={title} sub={[place, album.heldOn ? formatDate(album.heldOn, lang) : ""].filter(Boolean).join(" · ")} crumbs={[{ href: `/${lang}`, label: ui.home }, { href: `/${lang}/gallery`, label: parent }, { label: title }]} />
      <div className="mx-auto max-w-wrap px-5 py-12 sm:px-8 sm:py-14">
        {about && <p className="mb-10 max-w-3xl whitespace-pre-line break-words text-lg">{about}</p>}
        {photos.length ? <PhotoGrid photos={photos} lang={lang} /> : <p className="text-muted">{ui.noItems}</p>}
        <p className="mt-12">
          <Link href={`/${lang}/gallery`} className="inline-flex min-h-11 items-center font-medium text-brand underline decoration-signal decoration-2 underline-offset-4 hover:text-ink">← {setting(s, "gallery.back", lang)}</Link>
        </p>
      </div>
    </>
  );
}
