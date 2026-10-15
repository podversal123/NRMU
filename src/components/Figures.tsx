import { intlLocale, type Lang } from "@/lib/i18n";

/** A band of key numbers, all counted from the database. */
export default function Figures({ title, items, lang }: { title: string; items: { label: string; value: number }[]; lang: Lang }) {
  return (
    <section aria-labelledby="figures-title" className="relative overflow-hidden bg-ink py-12 text-light lg:py-14">
      {/* faint railway-track lines behind the numbers */}
      <div aria-hidden className="absolute inset-0 opacity-[0.06] [background-image:repeating-linear-gradient(90deg,#c8a45a_0_2px,transparent_2px_48px)]" />
      <div className="relative mx-auto max-w-wrap px-5 sm:px-8">
        <h2 id="figures-title" className="text-center text-sm font-bold uppercase tracking-[0.18em] text-signal">{title}</h2>
        <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-md bg-white/10 lg:grid-cols-4">
          {items.map((f) => (
            <div key={f.label} className="flex flex-col-reverse items-center bg-ink px-4 py-7 text-center">
              <dt className="mt-2 text-sm uppercase tracking-wide text-light/70">{f.label}</dt>
              <dd className="text-[2.3rem] font-bold leading-none text-white lg:text-[3rem]">{f.value.toLocaleString(intlLocale(lang))}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
