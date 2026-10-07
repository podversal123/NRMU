"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const SIZES = [92, 100, 112, 125];

function read(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

export default function A11yBar({
  lang,
  labels,
}: {
  lang: "en" | "hi";
  labels: { skip: string; textSize: string; contrast: string };
}) {
  const [size, setSize] = useState(1);
  const [high, setHigh] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const s = Number(read("nrmu-size"));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (s >= 0 && s < SIZES.length) setSize(s);
    setHigh(read("nrmu-contrast") === "high");
  }, []);

  useEffect(() => {
    document.documentElement.style.fontSize = `${SIZES[size]}%`;
    write("nrmu-size", String(size));
  }, [size]);

  useEffect(() => {
    if (high) document.documentElement.setAttribute("data-contrast", "high");
    else document.documentElement.removeAttribute("data-contrast");
    write("nrmu-contrast", high ? "high" : "normal");
  }, [high]);

  const other = lang === "en" ? "hi" : "en";
  const swapped = pathname.replace(/^\/(en|hi)(?=\/|$)/, `/${other}`);

  const btn =
    "grid h-7 min-w-7 place-items-center rounded px-1.5 text-xs font-bold text-white/90 transition hover:bg-white/15 focus-visible:bg-white/15";

  return (
    <div className="bg-ink text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-1.5 text-xs sm:px-6">
        <a
          href="#main"
          className="rounded px-2 py-1 font-semibold text-signal underline-offset-2 hover:underline"
        >
          {labels.skip}
        </a>
        <div className="flex items-center gap-1 sm:gap-2">
          <span className="hidden text-white/60 sm:inline">{labels.textSize}</span>
          <button className={btn} aria-label="Decrease text size" onClick={() => setSize((s) => Math.max(0, s - 1))}>
            A−
          </button>
          <button className={btn} aria-label="Default text size" onClick={() => setSize(1)}>
            A
          </button>
          <button
            className={btn}
            aria-label="Increase text size"
            onClick={() => setSize((s) => Math.min(SIZES.length - 1, s + 1))}
          >
            A+
          </button>
          <button
            className={`${btn} border border-white/30 ${high ? "bg-signal text-ink hover:bg-signal" : ""}`}
            aria-pressed={high}
            aria-label={labels.contrast}
            onClick={() => setHigh((h) => !h)}
          >
            ◐
          </button>
          <span className="mx-1 h-4 w-px bg-white/25" />
          <a
            href={swapped}
            hrefLang={other}
            onClick={() => {
              document.cookie = `nrmu-lang=${other}; path=/; max-age=31536000`;
            }}
            className="rounded bg-white/10 px-2.5 py-1 font-bold text-white hover:bg-signal hover:text-ink"
          >
            {lang === "en" ? "हिंदी" : "English"}
          </a>
        </div>
      </div>
    </div>
  );
}
