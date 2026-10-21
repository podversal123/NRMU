"use client";

import { useState } from "react";
import Icon from "@/components/Icon";

/** Print and "copy link" for a page, as two plain text buttons with an icon each. */
export default function PageTools({ print, share, copied }: { print: string; share: string; copied: string }) {
  const [done, setDone] = useState(false);
  const btn = "-my-2 inline-flex min-h-11 items-center gap-2 text-[0.95rem] text-ink/90 hover:text-brand";
  return (
    <div className="flex flex-wrap gap-x-6 print:hidden">
      <button type="button" className={btn} onClick={() => window.print()}>
        <Icon name="print" size={17} />
        {print}
      </button>
      <button
        type="button"
        className={btn}
        onClick={() => {
          navigator.clipboard?.writeText(window.location.href).then(() => {
            setDone(true);
            setTimeout(() => setDone(false), 2000);
          });
        }}
      >
        <Icon name="link" size={17} />
        <span aria-live="polite">{done ? copied : share}</span>
      </button>
    </div>
  );
}
