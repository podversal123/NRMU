"use client";

import { useMemo, useState } from "react";

type Cat = { id: number; parentId: number | null; name: string };
type Node = Cat & { children: Node[] };

/**
 * Categories as a tree: a parent opens to show what is inside it. Tick any number of them; the ticked ones are shown
 * as chips above the list and are sent with the form as repeated `name` inputs (the same field the old list used).
 * A search box finds a category anywhere in the tree and opens the branches that lead to it.
 */
export default function CategoryTree({ name, categories, selected }: { name: string; categories: Cat[]; selected: number[] }) {
  const [picked, setPicked] = useState<Set<number>>(() => new Set(selected));
  const [query, setQuery] = useState("");
  const byId = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const roots = useMemo(() => {
    const nodes = new Map<number, Node>(categories.map((c) => [c.id, { ...c, children: [] }]));
    const top: Node[] = [];
    for (const n of nodes.values()) {
      const parent = n.parentId ? nodes.get(n.parentId) : undefined;
      (parent ? parent.children : top).push(n);
    }
    const sort = (list: Node[]) => {
      list.sort((a, b) => a.name.localeCompare(b.name));
      list.forEach((n) => sort(n.children));
    };
    sort(top);
    return top;
  }, [categories]);

  /** Branches that start open: every parent of a ticked category, so what is chosen is visible at once. */
  const [open, setOpen] = useState<Set<number>>(() => {
    const s = new Set<number>();
    for (const id of selected) {
      let cur = byId.get(id)?.parentId ?? null;
      while (cur && !s.has(cur)) {
        s.add(cur);
        cur = byId.get(cur)?.parentId ?? null;
      }
    }
    return s;
  });

  const q = query.trim().toLowerCase();
  /** With a search, only the matching categories and the branches that lead to them are shown (and those branches are open). */
  const visible = useMemo(() => {
    if (!q) return null;
    const show = new Set<number>();
    for (const c of categories) {
      if (!c.name.toLowerCase().includes(q)) continue;
      let cur: number | null = c.id;
      while (cur && !show.has(cur)) {
        show.add(cur);
        cur = byId.get(cur)?.parentId ?? null;
      }
    }
    return show;
  }, [q, categories, byId]);

  const toggle = (id: number) =>
    setPicked((p) => {
      const n = new Set(p);
      if (!n.delete(id)) n.add(id);
      return n;
    });
  const flip = (id: number) =>
    setOpen((o) => {
      const n = new Set(o);
      if (!n.delete(id)) n.add(id);
      return n;
    });

  const pathOf = (id: number) => {
    const parts: string[] = [];
    let cur: number | null = id;
    while (cur && byId.get(cur)) {
      parts.unshift(byId.get(cur)!.name);
      cur = byId.get(cur)!.parentId;
    }
    return parts.join(" › ");
  };

  function branch(nodes: Node[], level: number) {
    const list = visible ? nodes.filter((n) => visible.has(n.id)) : nodes;
    if (!list.length) return null;
    return (
      <ul className={level ? "ml-4 border-l border-line pl-2" : ""} role={level ? "group" : "tree"}>
        {list.map((n) => {
          const hasKids = n.children.length > 0;
          const expanded = visible ? true : open.has(n.id);
          return (
            <li key={n.id} role="treeitem" aria-expanded={hasKids ? expanded : undefined} aria-selected={picked.has(n.id)}>
              <div className="flex items-center gap-1">
                {hasKids ? (
                  <button type="button" onClick={() => flip(n.id)} aria-label={`${expanded ? "Close" : "Open"} ${n.name}`} className="grid h-9 w-9 shrink-0 place-items-center rounded text-muted hover:bg-paper hover:text-ink">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`transition-transform ${expanded ? "rotate-90" : ""}`}>
                      <path d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ) : (
                  <span className="h-9 w-9 shrink-0" aria-hidden="true" />
                )}
                <label className="flex min-h-9 min-w-0 flex-1 cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-paper">
                  <input type="checkbox" checked={picked.has(n.id)} onChange={() => toggle(n.id)} className="h-5 w-5 shrink-0" />
                  <span className={`min-w-0 break-words ${hasKids ? "font-semibold" : ""}`}>{n.name}</span>
                  {hasKids && <span className="shrink-0 text-xs text-muted">({n.children.length})</span>}
                </label>
              </div>
              {hasKids && expanded && branch(n.children, level + 1)}
            </li>
          );
        })}
      </ul>
    );
  }

  const chips = [...picked].filter((id) => byId.has(id));

  return (
    <div>
      {[...picked].map((id) => (
        <input key={id} type="hidden" name={name} value={id} />
      ))}
      {chips.length > 0 ? (
        <ul className="mb-3 flex flex-wrap gap-2" aria-label="Chosen categories">
          {chips.map((id) => (
            <li key={id} className="inline-flex max-w-full items-center gap-1 rounded-full bg-soft/60 py-0.5 pl-3 pr-1 text-sm font-medium" title={pathOf(id)}>
              <span className="truncate">{byId.get(id)!.name}</span>
              <button type="button" onClick={() => toggle(id)} aria-label={`Remove ${byId.get(id)!.name}`} className="grid h-7 w-7 shrink-0 place-items-center rounded-full hover:bg-white">
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-3 text-sm text-muted">No category chosen yet.</p>
      )}
      <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search categories…" aria-label="Search categories" className="w-full rounded-lg border-2 border-line bg-white px-3.5 py-2 text-base focus:border-ink focus:outline-none" />
      <div className="mt-2 max-h-80 overflow-y-auto rounded-lg border-2 border-line bg-white p-2 text-[0.95rem]">
        {branch(roots, 0)}
        {visible && visible.size === 0 && <p className="px-2 py-3 text-sm text-muted">No category matches &quot;{query}&quot;.</p>}
      </div>
      <div className="mt-2 flex gap-4 text-sm">
        <button type="button" onClick={() => setOpen(new Set(categories.filter((c) => categories.some((k) => k.parentId === c.id)).map((c) => c.id)))} className="font-semibold text-brand hover:underline">
          Open all
        </button>
        <button type="button" onClick={() => setOpen(new Set())} className="font-semibold text-brand hover:underline">
          Close all
        </button>
        {chips.length > 0 && (
          <button type="button" onClick={() => setPicked(new Set())} className="ml-auto font-semibold text-brand hover:underline">
            Clear chosen
          </button>
        )}
      </div>
    </div>
  );
}
