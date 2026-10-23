import Link from "next/link";
import Icon from "@/components/Icon";

/** The icon of a quick link follows the page it leads to. */
const ICONS: [RegExp, string][] = [
  [/^\/orders/, "doc"],
  [/^\/grievance\/track/, "search"],
  [/^\/grievance/, "megaphone"],
  [/^\/officials/, "people"],
  [/^\/divisions/, "building"],
  [/^\/meetings/, "calendar"],
  [/^\/(gallery|events)/, "camera"],
  [/^\/(join|member)/, "user"],
  [/^\/(women|youth)/, "people"],
];
const iconFor = (href: string) => ICONS.find(([re]) => re.test(href))?.[1] ?? "doc";

export default function QuickLinks({ title, items, lang }: { title: string; items: { id: number; href: string; label: string }[]; lang: string }) {
  if (!items.length) return null;
  return (
    <section aria-labelledby="quick-title" className="bg-white py-10 lg:py-12">
      <div className="mx-auto max-w-wrap px-5 sm:px-8">
        <h2 id="quick-title" className="flex items-center gap-2.5 text-xl font-bold">
          <span aria-hidden className="h-5 w-1 rounded-full bg-brand" />
          {title}
        </h2>
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
          {items.map((q) => (
            <li key={q.id}>
              <Link href={`/${lang}${q.href}`} className="group relative flex h-full min-h-[8rem] flex-col items-center justify-center gap-3 overflow-hidden rounded-md border border-line bg-white p-4 text-center shadow-[0_1px_2px_rgba(21,22,26,0.04)] transition duration-200 hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-[0_12px_24px_-12px_rgba(138,33,29,0.35)]">
                <span aria-hidden className="absolute inset-x-0 bottom-0 h-[3px] origin-left scale-x-0 bg-signal transition-transform duration-300 group-hover:scale-x-100" />
                <span className="grid h-12 w-12 place-items-center rounded-full bg-brand text-white ring-4 ring-paper transition group-hover:bg-ink group-hover:text-signal">
                  <Icon name={iconFor(q.href)} />
                </span>
                <span className="text-[0.95rem] font-medium leading-snug">{q.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
