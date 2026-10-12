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
    <section aria-labelledby="quick-title" className="border-b border-line bg-white py-9 lg:py-10">
      <div className="mx-auto max-w-wrap px-5 sm:px-8">
        <h2 id="quick-title" className="text-xl font-semibold">{title}</h2>
        <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
          {items.map((q) => (
            <li key={q.id}>
              <Link href={`/${lang}${q.href}`} className="group flex h-full min-h-[7rem] flex-col items-center justify-center gap-3 border border-line bg-white p-4 text-center transition hover:border-ink hover:bg-paper">
                <span className="grid h-11 w-11 place-items-center bg-ink text-signal transition group-hover:bg-brand group-hover:text-white">
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
