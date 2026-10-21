import Link from "next/link";
import Icon from "@/components/Icon";

/**
 * The trail above an inner page's title: a house mark before the first step, chevrons between the steps and
 * the page itself in the brand colour at the end. `label` is the name read out for the trail.
 */
export default function Breadcrumb({ label, crumbs }: { label: string; crumbs: { href?: string; label: string }[] }) {
  return (
    <nav aria-label={label}>
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-muted">
        {crumbs.map((c, i) => (
          <li key={i} className="flex min-w-0 items-center gap-1.5">
            {c.href ? (
              <Link href={c.href} className="-mx-1 -my-2 inline-flex items-center gap-1.5 px-1 py-2 hover:text-brand">
                {i === 0 && <Icon name="home" size={15} />}
                {c.label}
              </Link>
            ) : (
              <span aria-current="page" className="max-w-[20rem] truncate font-semibold text-brand">
                {c.label}
              </span>
            )}
            {i < crumbs.length - 1 && (
              <span className="opacity-60">
                <Icon name="chevron" size={14} />
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
