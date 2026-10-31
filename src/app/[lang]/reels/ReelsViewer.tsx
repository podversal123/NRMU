"use client";

import { useEffect, useRef, useState } from "react";

export type ReelItem = { id: number; title: string; credit: string | null; video: string; poster: string };
type Labels = { soundOn: string; soundOff: string; hint: string; play: string; pause: string; of: string };

/**
 * A vertical list of videos, one per screen, that snaps as you scroll. The one in view plays by itself (without sound
 * until the viewer turns it on); the rest are paused. To spare data, only the reel in view and its neighbours load
 * their video; the others show just their still picture.
 */
export default function ReelsViewer({ reels, labels }: { reels: ReelItem[]; labels: Labels }) {
  const [active, setActive] = useState(0);
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(false);
  const boxes = useRef<(HTMLDivElement | null)[]>([]);
  const videos = useRef<(HTMLVideoElement | null)[]>([]);
  const reduced = useRef(false);
  const frame = useRef<HTMLDivElement>(null);

  // Which reel is mostly in view.
  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Bring the whole reel (and its sound button) into view as the page opens, instead of leaving it half below the fold.
    frame.current?.scrollIntoView({ block: "center", behavior: "auto" });
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting && e.intersectionRatio >= 0.6) setActive(Number((e.target as HTMLElement).dataset.i));
      },
      { threshold: [0.6] },
    );
    boxes.current.forEach((b) => b && io.observe(b));
    return () => io.disconnect();
  }, [reels.length]);

  // Play the reel in view, pause the others.
  useEffect(() => {
    videos.current.forEach((v, i) => {
      if (!v) return;
      if (i === active && !paused && !reduced.current) v.play().catch(() => {});
      else v.pause();
      if (i !== active) v.currentTime = 0;
    });
  }, [active, paused]);

  const go = (to: number) => boxes.current[Math.min(reels.length - 1, Math.max(0, to))]?.scrollIntoView({ behavior: reduced.current ? "auto" : "smooth", block: "nearest" });

  return (
    <div
      ref={frame}
      className="relative mx-auto h-[calc(100dvh-9rem)] min-h-[30rem] w-full max-w-[26rem] snap-y snap-mandatory overflow-y-auto overscroll-contain rounded-xl bg-black shadow-xl outline-none"
      tabIndex={0}
      role="region"
      aria-label="Reels"
      onKeyDown={(e) => {
        if (e.key === "ArrowDown" || e.key === "PageDown") {
          e.preventDefault();
          go(active + 1);
        } else if (e.key === "ArrowUp" || e.key === "PageUp") {
          e.preventDefault();
          go(active - 1);
        }
      }}
    >
      {reels.map((r, i) => (
        <div key={r.id} ref={(el) => void (boxes.current[i] = el)} data-i={i} className="relative h-full w-full snap-start snap-always">
          <video
            ref={(el) => void (videos.current[i] = el)}
            src={Math.abs(i - active) <= 1 ? r.video : undefined}
            poster={r.poster}
            muted={muted}
            loop
            playsInline
            preload={i === active ? "auto" : "metadata"}
            onClick={() => setPaused((p) => !p)}
            className="h-full w-full cursor-pointer bg-black object-contain"
            aria-label={r.title}
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-4 pb-5 pt-16 text-white">
            <p className="text-lg font-semibold leading-snug">{r.title}</p>
            {r.credit && <p className="mt-1 text-xs text-white/75">{r.credit}</p>}
            <p className="mt-2 text-xs text-white/70">
              {i + 1} {labels.of} {reels.length}
              {i === 0 && reels.length > 1 ? ` · ${labels.hint}` : ""}
            </p>
          </div>
          {i === active && paused && (
            <span className="pointer-events-none absolute inset-0 grid place-items-center">
              <span className="grid h-16 w-16 place-items-center rounded-full bg-black/55 text-white">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-label={labels.play}>
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
            </span>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={() => setMuted((m) => !m)}
        aria-pressed={!muted}
        className="sticky bottom-4 float-right mr-4 -mt-14 mb-4 grid h-12 w-12 place-items-center rounded-full bg-black/60 text-white backdrop-blur hover:bg-black/80"
        aria-label={muted ? labels.soundOn : labels.soundOff}
        title={muted ? labels.soundOn : labels.soundOff}
      >
        {muted ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M11 5L6 9H2v6h4l5 4V5z" />
            <path d="M23 9l-6 6M17 9l6 6" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M11 5L6 9H2v6h4l5 4V5z" />
            <path d="M15.5 8.5a5 5 0 010 7M19 5a10 10 0 010 14" />
          </svg>
        )}
      </button>
    </div>
  );
}
