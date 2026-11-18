import Link from "next/link";

/** A list of links, one per division, each opening that division's own page. */
export default function OfficialsPicker({ items }: { items: { href: string; label: string; count?: number }[] }) {
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((i) => (
        <li key={i.href}>
          <Link href={i.href} className="group flex min-h-14 items-center justify-between gap-3 rounded-xl border border-line bg-white px-5 py-3 font-medium shadow-[0_2px_10px_-4px_rgba(111,26,23,0.18)] transition-colors duration-200 hover:border-brand hover:bg-brand hover:text-white">
            <span className="min-w-0 break-words">{i.label}</span>
            {i.count !== undefined && <span className="shrink-0 text-sm text-muted transition-colors group-hover:text-white/80">{i.count}</span>}
          </Link>
        </li>
      ))}
    </ul>
  );
}
