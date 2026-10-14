"use client";

import { useEffect, useState } from "react";
import Icon from "./Icon";

/** A round button in the lower right corner that appears after one screen of scrolling and takes the visitor back up. */
export default function BackToTop({ label }: { label: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const check = () => setShow(window.scrollY > window.innerHeight);
    check();
    window.addEventListener("scroll", check, { passive: true });
    return () => window.removeEventListener("scroll", check);
  }, []);
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      tabIndex={show ? 0 : -1}
      aria-hidden={!show || undefined}
      onClick={() => window.scrollTo({ top: 0 })}
      className={`print-chrome fixed bottom-5 right-5 z-30 grid h-12 w-12 place-items-center rounded-full bg-brand text-white shadow-[0_10px_24px_-8px_rgba(0,0,0,0.5)] ring-1 ring-white/20 transition duration-300 hover:bg-brand-deep sm:bottom-6 sm:right-6 ${show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"}`}
    >
      <Icon name="up" size={20} />
    </button>
  );
}
