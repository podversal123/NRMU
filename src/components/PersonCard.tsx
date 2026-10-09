import Image from "next/image";
import type { Lang } from "@/lib/i18n";
import { pick } from "@/lib/queries";

export type Person = {
  nameEn: string;
  nameHi: string | null;
  designationEn: string | null;
  designationHi: string | null;
  placeLabel?: string | null;
  addressEn: string | null;
  phone: string | null;
  photoUrl: string | null;
};

const initialsOf = (name: string) =>
  name
    .replace(/^(Sh|Shri|Smt|Dr|Com)\.?\s+/i, "")
    .split(/[ .,]+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

export default function PersonCard({ p, lang, callLabel }: { p: Person; lang: Lang; callLabel: string }) {
  return (
    <article className="flex min-w-0 gap-4 border border-line bg-white p-4 sm:p-5">
      {p.photoUrl ? (
        <Image src={p.photoUrl} alt="" width={64} height={64} className="h-16 w-16 shrink-0 rounded-full object-cover ring-2 ring-signal" />
      ) : (
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-ink font-display text-xl font-semibold text-signal ring-2 ring-signal">
          {initialsOf(p.nameEn)}
        </div>
      )}
      <div className="min-w-0 break-words">
        <h3 className="text-[1.05rem] font-semibold leading-snug">{pick(lang, p.nameEn, p.nameHi)}</h3>
        <p className="text-sm font-semibold text-brand">
          {pick(lang, p.designationEn, p.designationHi)}
          {p.placeLabel ? ` · ${p.placeLabel}` : ""}
        </p>
        {p.addressEn && <p className="mt-2 text-sm leading-relaxed text-muted">{p.addressEn}</p>}
        {p.phone && (
          <a href={`tel:${p.phone.replace(/\s/g, "")}`} className="-mb-2 mt-1 inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-ink hover:text-brand" aria-label={`${callLabel} ${p.phone}`}>
            ☎ {p.phone}
          </a>
        )}
      </div>
    </article>
  );
}
