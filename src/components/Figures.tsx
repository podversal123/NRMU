/** A band of key numbers, all counted from the database. */
export default function Figures({ title, items, lang }: { title: string; items: { label: string; value: number }[]; lang: string }) {
  return (
    <section aria-labelledby="figures-title" className="bg-ink py-10 text-light lg:py-12">
      <div className="mx-auto max-w-wrap px-5 sm:px-8">
        <h2 id="figures-title" className="text-xl font-semibold text-soft">{title}</h2>
        <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-8 lg:grid-cols-4">
          {items.map((f) => (
            <div key={f.label} className="border-l-2 border-signal pl-4">
              <dd className="text-[2.1rem] font-bold leading-none lg:text-[2.6rem]">{f.value.toLocaleString(lang === "hi" ? "hi-IN" : "en-IN")}</dd>
              <dt className="mt-2 text-light/80">{f.label}</dt>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
