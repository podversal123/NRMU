import { notFound } from "next/navigation";
import PageHero from "@/components/PageHero";
import { isLang } from "@/lib/i18n";
import { getGalleryPhotos } from "@/lib/content";
import { formatDate, getSettings, pick, setting, getUi } from "@/lib/queries";
import { navTitle } from "@/lib/nav";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return { title: isLang(lang) ? await navTitle(lang, "/gallery") : undefined };
}

export default async function GalleryPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const ui = await getUi(lang);
  const [photos, s, title] = await Promise.all([getGalleryPhotos(200), getSettings(), navTitle(lang, "/gallery")]);
  return (
    <>
      <PageHero lang={lang} title={title} sub={setting(s, "gallery.sub", lang)} crumbs={[{ href: `/${lang}`, label: ui.home }, { label: title }]} />
      <div className="mx-auto max-w-[1180px] px-5 py-14 sm:px-8">
        {photos.length ? (
          <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
            {photos.map((p) => (
              <figure key={p.id} className="mb-4 break-inside-avoid overflow-hidden bg-white">
                <a href={p.url} target="_blank" rel="noopener noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt={pick(lang, p.captionEn, p.captionHi)} loading="lazy" className="w-full" />
                </a>
                {(p.captionEn || p.takenOn) && (
                  <figcaption className="border-t border-line px-4 py-3 text-sm">
                    {p.captionEn && <span className="block font-medium">{pick(lang, p.captionEn, p.captionHi)}</span>}
                    {p.takenOn && <span className="text-muted">{formatDate(p.takenOn, lang)}</span>}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        ) : (
          <p className="text-muted">{ui.noItems}</p>
        )}
      </div>
    </>
  );
}
