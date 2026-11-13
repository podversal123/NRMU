import type { FanItem } from "@/components/MeetingFan";
import { intlLocale, type Lang } from "@/lib/i18n";
import { pick } from "@/lib/queries";
import type { PublicMeetingType } from "@/lib/content";

/** "Annual General Meeting (AGM)" gives AGM; a name without a bracket gives its initials ("Standing Committee" gives SC). */
function shortName(name: string) {
  const m = name.match(/\(([^)]+)\)/);
  if (m) return m[1];
  return name.split(/\s+/).filter(Boolean).map((w) => w[0]).join("").slice(0, 3).toUpperCase();
}

/**
 * The fan of cards for some kinds of meeting. A kind's count includes the meetings of the kinds inside it
 * (PNM counts Opening Speech, Regular Agenda Meeting and Informal Meeting too).
 */
export function fanItems(lang: Lang, kinds: PublicMeetingType[], all: PublicMeetingType[], unit: string): FanItem[] {
  return kinds.map((k) => {
    const count = k.count + all.filter((c) => c.parentId === k.id).reduce((n, c) => n + c.count, 0);
    return {
      id: k.id,
      title: pick(lang, k.nameEn, k.nameHi, k.i18n?.name).replace(/\s*\([^)]*\)\s*/, "").trim(),
      short: shortName(k.nameEn),
      count: `${count.toLocaleString(intlLocale(lang))} ${unit}`,
      href: `/${lang}/meetings/${k.id}`,
    };
  });
}
