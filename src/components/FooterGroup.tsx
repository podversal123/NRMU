"use client";

import { useId, useState } from "react";

/**
 * One column of footer links. On phones it is a closed section that opens with a tap, so the whole footer stays short;
 * from tablet width up it is always open and the button is not shown.
 */
export default function FooterGroup({ title, headingClass, children }: { title: string; headingClass: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className="min-w-0 border-t border-white/10 md:border-0">
      <h2 className={headingClass}>
        <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)} className="flex min-h-11 w-full items-center justify-between text-left md:hidden">
          {title}
          <svg width="12" height="12" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden className={`transition-transform ${open ? "rotate-180" : ""}`}>
            <path d="m2 3.5 3 3 3-3" />
          </svg>
        </button>
        <span className="hidden md:inline">{title}</span>
      </h2>
      <div id={id} className={`${open ? "block" : "hidden"} pb-4 md:mt-4 md:block md:pb-0`}>
        {children}
      </div>
    </div>
  );
}
