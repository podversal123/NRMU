import Photo from "@/components/Photo";
import { typeLabel } from "@/lib/download";
import type { FeedMedia as Media } from "@/lib/feed";
import FileCards, { type FileCardText } from "./FileCards";

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
 * last tile), then documents as file cards that open at the side. Videos play in place and load only their first frame until played.
 */

export default function FeedMedia({ media, alt, fileLabel, fileText }: { media: Media[]; alt: string; fileLabel: string; fileText: FileCardText }) {
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
        <FileCards files={files.map((f) => ({ file: f, name: fileName(f), type: typeLabel(f.url, fileLabel) }))} text={fileText} shifted={shown.length > 0} />
      )}
    </>
  );
}
