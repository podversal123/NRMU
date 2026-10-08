"use client";

import { useState } from "react";

/** Print and "copy link" buttons for a page. */
export default function PageTools({ print, share, copied }: { print: string; share: string; copied: string }) {
  const [done, setDone] = useState(false);
  const btn = "border border-line bg-white px-4 py-2 text-sm font-medium hover:border-ink";
  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <button type="button" className={btn} onClick={() => window.print()}>
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
        {done ? copied : share}
      </button>
    </div>
  );
}
