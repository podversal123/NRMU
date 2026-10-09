import Link from "next/link";
import Photo from "@/components/Photo";
import type { Lang } from "@/lib/i18n";
import { formatDate, pick } from "@/lib/queries";
import type { CardRow } from "@/lib/content";

/** Cards for posts; shows the photo when there is one (gallery) and a text card otherwise. */
export default function PostGrid({ rows, lang, photos = false }: { rows: CardRow[]; lang: Lang; photos?: boolean }) {
  return (
    <ul className={`grid gap-5 ${photos ? "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
      {rows.map((p) => (
        <li key={p.id}>
          <Link
            href={`/${lang}/orders/${p.id}`}
            className="group flex h-full flex-col overflow-hidden border border-line bg-white transition hover:-translate-y-1 hover:border-ink hover:shadow-[0_8px_0_var(--ink)]"
          >
            {photos && p.thumbUrl && (
              <div className="relative aspect-[4/3] w-full bg-paper">
                <Photo src={p.thumbUrl} alt="" fill sizes="(min-width: 1280px) 25vw, (min-width: 640px) 33vw, 100vw" className="object-cover" />
              </div>
            )}
            <div className="flex flex-1 flex-col p-5">
              <p className="font-mono text-xs font-bold text-muted">{formatDate(p.publishedAt, lang)}</p>
              <h3 className="mt-2 line-clamp-3 font-sans text-[1.05rem] font-medium leading-snug group-hover:text-brand">
                {pick(lang, p.titleEn, p.titleHi)}
              </h3>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
