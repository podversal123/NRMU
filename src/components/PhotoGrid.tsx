import Photo from "@/components/Photo";
import type { GalleryRow } from "@/lib/content";
import type { Lang } from "@/lib/i18n";
import { formatDate, pick } from "@/lib/queries";

/** Photographs in a masonry layout; each opens full size in a new tab. */
export default function PhotoGrid({ photos, lang }: { photos: GalleryRow[]; lang: Lang }) {
  return (
    <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
      {photos.map((p) => (
        <figure key={p.id} className="mb-4 break-inside-avoid overflow-hidden border border-line bg-white">
          <a href={p.url} target="_blank" rel="noopener noreferrer">
            <Photo src={p.url} alt={pick(lang, p.captionEn, p.captionHi)} width={900} height={675} sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="h-auto w-full" />
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
  );
}
