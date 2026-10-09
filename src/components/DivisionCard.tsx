import Link from "next/link";
import type { Lang } from "@/lib/i18n";
import { pick } from "@/lib/queries";

export type DivisionCardData = {
  slug: string;
  nameEn: string;
  nameHi: string | null;
  branches: number;
  secretaries: number;
  secretaryEn: string | null;
  secretaryHi: string | null;
};

/** The one division card used on the home page and on the divisions page. Everything shown comes from the database. */
export default function DivisionCard({
  d,
  lang,
  labels,
  className = "",
}: {
  d: DivisionCardData;
  lang: Lang;
  labels: { secretary: string; branches: string; branchSecretaries: string };
  className?: string;
}) {
  const num = (n: number) => n.toLocaleString(lang === "hi" ? "hi-IN" : "en-IN");
  const secretary = pick(lang, d.secretaryEn, d.secretaryHi);
  return (
    <Link
      href={`/${lang}/divisions/${d.slug}`}
      className={`group relative flex min-h-[15rem] flex-col justify-between overflow-hidden bg-ink p-6 text-light transition-transform duration-300 hover:-translate-y-1 sm:min-h-[17rem] sm:p-7 xl:min-h-[16rem] xl:p-5 ${className}`}
    >
      <span aria-hidden className="absolute inset-x-0 top-0 h-1 origin-left scale-x-[0.18] bg-signal transition-transform duration-500 group-hover:scale-x-100" />
      <span aria-hidden className="absolute right-6 top-7 text-xl xl:right-4 xl:top-5 text-light/40 transition group-hover:translate-x-1 group-hover:text-signal">
        →
      </span>

      <div>
        <h3 className="max-w-[85%] break-words text-[1.5rem] font-medium leading-tight sm:text-[1.75rem] xl:text-[1.35rem]">{pick(lang, d.nameEn, d.nameHi)}</h3>
        {d.nameHi && <p className="mt-2 text-soft/85">{lang === "hi" ? d.nameEn : d.nameHi}</p>}
      </div>

      <div>
        {secretary && (
          <div className="mb-5">
            <p className="text-sm text-signal">{labels.secretary}</p>
            <p className="mt-0.5 text-[1.05rem] font-medium leading-snug">{secretary}</p>
          </div>
        )}
        <dl className="flex gap-7 border-t border-white/15 pt-4 sm:gap-9 xl:gap-5">
          <div>
            <dd className="text-[1.3rem] font-semibold leading-none">{num(d.branches)}</dd>
            <dt className="mt-1 text-sm text-light/70">{labels.branches}</dt>
          </div>
          <div>
            <dd className="text-[1.3rem] font-semibold leading-none">{num(d.secretaries)}</dd>
            <dt className="mt-1 text-sm text-light/70">{labels.branchSecretaries}</dt>
          </div>
        </dl>
      </div>
    </Link>
  );
}
