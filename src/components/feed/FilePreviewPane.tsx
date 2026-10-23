"use client";

import { useEffect, useState } from "react";
import { PdfFrame, PREVIEW_EVENT, PreviewHead, type FileCardText, type Preview } from "./FileCards";

/**
 * The empty room beside the wall's column on wide screens: a PDF opened from a file card is shown here, held in
 * view while the posts scroll. Hidden below the extra-large breakpoint, where it would be too narrow; there the file
 * cards open their own side panel.
 */
export default function FilePreviewPane({ text }: { text: FileCardText }) {
  const [open, setOpen] = useState<Preview | null>(null);

  useEffect(() => {
    const on = (e: Event) => setOpen((e as CustomEvent<Preview | null>).detail);
    window.addEventListener(PREVIEW_EVENT, on);
    return () => window.removeEventListener(PREVIEW_EVENT, on);
  }, []);

  const close = () => window.dispatchEvent(new CustomEvent(PREVIEW_EVENT, { detail: null }));

  return (
    <aside id="file-preview-pane" aria-label={open?.name} className="hidden min-w-0 flex-1 xl:block xl:me-[min(0px,calc((var(--container-wrap)-100vw)/2+1.5rem))]">
      {open && (
        <div className="sticky top-[calc(var(--below-header,5.25rem)+0.75rem)] flex h-[calc(100dvh-var(--below-header,5.25rem)-1.5rem)] flex-col overflow-hidden rounded-t-2xl border border-line bg-white shadow-[0_1px_2px_rgba(21,22,26,0.04),0_18px_40px_-24px_rgba(21,22,26,0.3)] transition-[top,height] duration-300 motion-reduce:transition-none">
          <PreviewHead file={open} text={text} onClose={close} />
          <PdfFrame file={open} />
        </div>
      )}
    </aside>
  );
}
