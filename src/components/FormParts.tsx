// Member forms (join, sign in): one card with a soft shadow, rounded fields and a full-width maroon button.
// The card has no overflow-hidden: dropdowns inside must open past its edge.
export const memberCard = "flex flex-col rounded-md border border-line bg-white shadow-[0_1px_2px_rgba(21,22,26,0.04),0_8px_24px_-12px_rgba(21,22,26,0.12)]";
export const memberField = "w-full rounded-md border border-line bg-white px-4 py-3 text-base field-bare transition-colors focus:border-brand focus:outline-none";
export const memberButton = "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-brand px-8 text-lg font-semibold text-white shadow-[0_6px_16px_-8px_rgba(111,26,23,0.6)] transition hover:bg-brand-deep active:translate-y-px disabled:cursor-wait disabled:opacity-60";

/** Marks a field the form cannot be sent without; screen readers get this from the field's `required`. */
export const Req = () => (
  <span aria-hidden className="ms-0.5 text-brand">
    *
  </span>
);

/** Title bar of one section of a form card: a step number and the section name. */
export function Step({ n, id, title }: { n: number; id: string; title: string }) {
  return (
    <header className="flex items-center gap-3 rounded-t-md border-b border-line bg-gradient-to-b from-paper/70 to-white px-6 py-4">
      <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-brand text-sm font-bold text-white">
        {n}
      </span>
      <h2 id={id} className="text-lg font-semibold leading-tight">
        {title}
      </h2>
    </header>
  );
}

/** Maroon strip across the top of a member form card (join, sign in), with a gold line under it. */
export function CardTitle({ title }: { title: string }) {
  return (
    <div className="rounded-t-md border-b-2 border-signal bg-brand px-6 py-4 sm:px-8">
      <p className="font-display text-xl font-semibold text-white">{title}</p>
    </div>
  );
}

/** Section heading inside a single form card: a small gold number, the name in capitals, and a line to the edge. */
export function Section({ n, id, title }: { n: number; id: string; title: string }) {
  return (
    <h2 id={id} className="flex items-center gap-3 text-sm font-bold uppercase tracking-[0.12em] text-ink">
      <span aria-hidden className="font-display text-base tabular-nums text-signal">
        {String(n).padStart(2, "0")}
      </span>
      {title}
      <span aria-hidden className="h-px flex-1 bg-line" />
    </h2>
  );
}
