import indexJson from "../../data/index.json";
import categoriesJson from "../../data/categories.json";
import type { Lang } from "./i18n";

export type PostMeta = {
  id: number;
  date: string;
  slug: string;
  title: string;
  excerpt: string;
  cats: number[];
  pdfs: number;
  pdf: string | null;
  img: string | null;
};
export type Category = { id: number; name: string; slug: string; parent: number; count: number };

export const posts = indexJson as PostMeta[];
export const categories = categoriesJson as Category[];

const byId = new Map(categories.map((c) => [c.id, c]));
const GENERIC = new Set([1, 1042]); // Uncategorized, Featured

const depth = (c: Category): number => {
  let d = 0;
  let cur: Category | undefined = c;
  while (cur && cur.parent) {
    d++;
    cur = byId.get(cur.parent);
  }
  return d;
};

export function categoryLabel(p: PostMeta): string | null {
  const list = p.cats
    .filter((id) => !GENERIC.has(id))
    .map((id) => byId.get(id))
    .filter((c): c is Category => Boolean(c))
    .sort((a, b) => depth(b) - depth(a));
  return list[0]?.name ?? null;
}

export function formatDate(iso: string, lang: Lang) {
  const d = new Date(iso + "T00:00:00");
  return new Intl.DateTimeFormat(lang === "hi" ? "hi-IN" : "en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

export const archiveSince = posts.reduce((min, p) => (p.date < min ? p.date : min), "9999").slice(0, 4);
