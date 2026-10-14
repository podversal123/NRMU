import type { Lang } from "@/lib/i18n";
import { pick } from "@/lib/queries";
import DivisionBoard, { type BoardItem } from "./DivisionBoard";
import DivisionCards from "./DivisionCards";
import DivisionDeck from "./DivisionDeck";

export type DivisionCardData = {
  slug: string;
  nameEn: string;
  nameHi: string | null;
  branches: number;
  secretaries: number;
  secretaryEn: string | null;
  secretaryHi: string | null;
};

type Labels = { secretary: string; branches: string; branchSecretaries: string; next?: string; previous?: string };

/**
 * Divisions on the home page and the divisions page. Resolves the language here on the server
 * so the interactive board only receives plain strings. Everything shown comes from the database.
 */
export default function DivisionList({
  divisions,
  lang,
  labels,
  variant = "board",
}: {
  divisions: DivisionCardData[];
  lang: Lang;
  labels: Labels;
  variant?: "board" | "cards" | "deck";
}) {
  const num = (n: number) => n.toLocaleString(lang === "hi" ? "hi-IN" : "en-IN");
  const items: BoardItem[] = divisions.map((d) => ({
    href: `/${lang}/divisions/${d.slug}`,
    name: pick(lang, d.nameEn, d.nameHi),
    other: (lang === "hi" ? d.nameEn : d.nameHi) ?? "",
    secretary: pick(lang, d.secretaryEn, d.secretaryHi),
    branches: num(d.branches),
    secretaries: num(d.secretaries),
  }));
  if (variant === "deck") {
    return <DivisionDeck items={items} labels={{ secretary: labels.secretary, branches: labels.branches, branchSecretaries: labels.branchSecretaries, next: labels.next ?? "", previous: labels.previous ?? "" }} />;
  }
  if (variant === "cards") {
    const cards = items;
    return <DivisionCards items={cards} labels={labels} />;
  }
  return <DivisionBoard items={items} labels={labels} />;
}
