import Photo from "@/components/Photo";
import type { FeedMedia as Media } from "@/lib/feed";

const fileName = (m: Media) => {
  if (m.name) return m.name;
  try {
    return decodeURIComponent(m.url.split("/").pop() ?? m.url);
  } catch {
    return m.url;
  }
};

/**
 * Photos and videos of a feed item in a grid (one large, two side by side, or a two-by-two block with "+N" on the
 * last tile), then documents as a list. Videos play in place and load only their first frame until played.
 */
/** The file's type as printed on its icon (PDF, DOCX, XLSX ...), from its extension; `fallback` when it has none. */
const typeLabel = (url: string, fallback: string) => {
  const ext = url.split("?")[0].split(".").pop() ?? "";
  return /^[a-z0-9]{2,4}$/i.test(ext) ? ext.toUpperCase() : fallback;
};

export default function FeedMedia({ media, alt, fileLabel, downloadLabel }: { media: Media[]; alt: string; fileLabel: string; downloadLabel: string }) {
  const visual = media.filter((m) => m.kind === "image" || m.kind === "video");
  const files = media.filter((m) => m.kind === "file");
  const shown = visual.slice(0, 4);
  const extra = visual.length - shown.length;

  return (
    <>
      {shown.length > 0 && (
        <div className={`grid gap-0.5 overflow-hidden rounded-2xl border border-line bg-line ${shown.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
          {shown.map((m, i) => (
            <div
              key={m.url}
              className={`relative ${m.kind === "video" ? "bg-black" : "bg-paper"} ${shown.length === 1 ? "aspect-[16/10]" : shown.length === 3 && i === 0 ? "row-span-2 aspect-auto" : "aspect-square"}`}
            >
              {m.kind === "video" ? (
                <video src={m.url} controls preload="metadata" playsInline className="absolute inset-0 h-full w-full bg-black object-contain" />
              ) : (
                <a href={m.url} target="_blank" rel="noopener noreferrer" className="absolute inset-0 block">
                  <Photo src={m.url} alt={alt} fill sizes="(min-width: 768px) 42rem, 100vw" className={shown.length === 1 ? "object-contain" : "object-cover"} />
                </a>
              )}
              {i === shown.length - 1 && extra > 0 && (
                <span aria-hidden className="pointer-events-none absolute inset-0 grid place-items-center bg-ink/55 text-2xl font-bold text-white">
                  +{extra}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
      {files.length > 0 && (
        // each document as a small file card: a sheet of paper with its type on a red band, the name, and a download button
        <ul className={`grid gap-2 sm:grid-cols-2 ${shown.length ? "pt-2" : ""}`}>
          {files.map((f) => {
            const type = typeLabel(f.url, fileLabel);
            return (
              <li key={f.url} className="min-w-0">
                <a href={f.url} target="_blank" rel="noopener noreferrer" download className="flex h-full items-center gap-3 rounded-2xl border border-line bg-white p-3">
                  <span aria-hidden className="relative h-12 w-10 shrink-0 rounded-[3px] border border-line bg-paper/60 [clip-path:polygon(0_0,72%_0,100%_22%,100%_100%,0_100%)]">
                    <span className="absolute right-0 top-0 h-[22%] w-[28%] rounded-bl-[2px] bg-line" />
                    <span className="absolute -left-px bottom-2 rounded-r-[2px] bg-brand px-1 py-px text-[0.58rem] font-bold leading-none text-white">{type}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 break-words text-sm font-semibold leading-snug">{fileName(f)}</span>
                    <span className="mt-0.5 block text-xs text-muted">
                      {type} · {downloadLabel}
                    </span>
                  </span>
                  <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-brand text-white">
                    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 4v12M6 11l6 6 6-6M5 20h14" />
                    </svg>
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
