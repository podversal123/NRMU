import type { ReactNode } from "react";

/** Rounded card with a soft shadow that turns over once (180deg) on hover. The back face repeats the front, so the card
 *  reads the same after the turn; the outer box keeps the hover area so the turn is not cut short. */
export default function FlipCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  const face = `person-face rounded-xl border border-line bg-white shadow-[0_2px_10px_-4px_rgba(111,26,23,0.18)] transition-[border-color,box-shadow] duration-300 [grid-area:1/1] ${className}`;
  return (
    <div className="person-flip h-full min-w-0">
      <div className="person-turn grid h-full">
        <div className={face}>{children}</div>
        <div className={`${face} person-back`} aria-hidden inert>
          {children}
        </div>
      </div>
    </div>
  );
}
