"use client";

import { useEffect, useRef, useState } from "react";
import { downloadUrl } from "@/lib/download";
import type { FeedMedia as Media } from "@/lib/feed";

export type FileCardText = { download: string; newTab: string; close: string };
export type Preview = { url: string; name: string };

/** Sent on `window` with the file to show (or null to close) when the wall page has a preview pane beside it. */
export const PREVIEW_EVENT = "nrmu:file-preview";

const isPdf = (url: string) => /\.pdf$/i.test(url.split("?")[0]);

const DownloadIcon = ({ className }: { className: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M12 4v12M6 11l6 6 6-6M5 20h14" />
  </svg>
);

/**
 * The PDF itself, in the browser's own viewer fitted to the width. That viewer fits the page before its scrollbar
 * takes room, so it then shows a needless sideways scrollbar along the bottom; the frame is made taller than its box
 * by that bar's height and the box clips it off.
 */
export function PdfFrame({ file }: { file: Preview }) {
  return (
    <div className="relative min-h-0 flex-1 overflow-hidden overscroll-contain bg-paper">
      <iframe key={file.url} src={`${file.url}#view=FitH&navpanes=0`} title={file.name} className="absolute inset-x-0 top-0 h-[calc(100%+1.25rem)] w-full" />
    </div>
  );
}

/** The bar over a previewed file: its name, open in a new tab, download, and close. */
export function PreviewHead({ file, text, onClose }: { file: Preview; text: FileCardText; onClose: () => void }) {
  return (
    <div className="flex items-center gap-3 border-b border-line px-4 py-3 sm:px-5">
      <p className="line-clamp-2 min-w-0 flex-1 text-sm font-semibold leading-snug sm:text-base">{file.name}</p>
      <a
        href={file.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={text.newTab}
        title={text.newTab}
        className="grid size-10 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-paper hover:text-ink"
      >
        <svg viewBox="0 0 24 24" className="size-[1.15rem]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
        </svg>
      </a>
      <a
        href={downloadUrl(file.url)}
        download
        className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-brand px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-deep"
      >
        <DownloadIcon className="size-4" />
        <span className="max-sm:sr-only">{text.download}</span>
      </a>
      <button
        type="button"
        onClick={onClose}
        aria-label={text.close}
        title={text.close}
        className="grid size-10 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-paper hover:text-ink"
      >
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden>
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>
  );
}

/**
 * Documents of a feed item as small file cards: a sheet of paper with its type on a red band, the name, and a
 * download button. A click on the card shows a PDF in the pane beside the wall when the page has one on screen,
 * otherwise in a panel that slides in from the side; the round button downloads it. Browsers that cannot show a PDF
 * inside the page (most phones) and other kinds of file open in a new tab instead.
 */
export default function FileCards({ files, text, shifted }: { files: { file: Media; name: string; type: string }[]; text: FileCardText; shifted: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState<Preview | null>(null);
  // the file now in the pane, so its card can be marked
  const [shown, setShown] = useState<string | null>(null);

  useEffect(() => {
    const on = (e: Event) => setShown((e as CustomEvent<Preview | null>).detail?.url ?? null);
    window.addEventListener(PREVIEW_EVENT, on);
    return () => window.removeEventListener(PREVIEW_EVENT, on);
  }, []);

  const show = (url: string, name: string) => {
    if (!isPdf(url) || navigator.pdfViewerEnabled === false) {
      window.open(url, "_blank", "noopener");
      return;
    }
    const pane = document.getElementById("file-preview-pane");
    if (pane && pane.offsetParent !== null) {
      window.dispatchEvent(new CustomEvent<Preview>(PREVIEW_EVENT, { detail: { url, name } }));
      return;
    }
    setOpen({ url, name });
    dialog.current?.showModal();
  };

  return (
    <>
      <ul className={`grid gap-2 sm:grid-cols-2 ${shifted ? "pt-2" : ""}`}>
        {files.map(({ file: f, name, type }) => (
          <li key={f.url} className="relative min-w-0">
            <button
              type="button"
              onClick={() => show(f.url, name)}
              aria-pressed={shown === f.url}
              className={`flex h-full w-full items-center gap-3 rounded-2xl border bg-white p-3 pe-14 text-start transition-colors hover:border-brand/40 hover:bg-[#fbf8f4] ${shown === f.url ? "border-brand bg-[#fbf8f4] ring-1 ring-brand" : "border-line"}`}
            >
              <span aria-hidden className="relative h-12 w-10 shrink-0 rounded-[3px] border border-line bg-paper/60 [clip-path:polygon(0_0,72%_0,100%_22%,100%_100%,0_100%)]">
                <span className="absolute right-0 top-0 h-[22%] w-[28%] rounded-bl-[2px] bg-line" />
                <span className="absolute -left-px bottom-2 rounded-r-[2px] bg-brand px-1 py-px text-[0.58rem] font-bold leading-none text-white">{type}</span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 break-words text-sm font-semibold leading-snug">{name}</span>
                <span className="mt-0.5 block text-xs text-muted">
                  {type} · {text.download}
                </span>
              </span>
            </button>
            <a
              href={downloadUrl(f.url)}
              download
              aria-label={`${text.download}: ${name}`}
              className="absolute end-3 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-brand text-white transition-colors hover:bg-brand-deep"
            >
              <DownloadIcon className="size-4" />
            </a>
          </li>
        ))}
      </ul>

      {/* the side panel for narrower screens: a modal dialog, so Esc, the close button or a click outside closes it */}
      <dialog
        ref={dialog}
        aria-label={open?.name}
        onClose={() => setOpen(null)}
        onClick={(e) => e.target === e.currentTarget && dialog.current?.close()}
        className="file-panel"
      >
        {open && (
          <div className="flex h-full flex-col bg-white">
            <PreviewHead file={open} text={text} onClose={() => dialog.current?.close()} />
            <PdfFrame file={open} />
          </div>
        )}
      </dialog>
    </>
  );
}
