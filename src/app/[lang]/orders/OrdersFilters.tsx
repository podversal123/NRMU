"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import Icon from "@/components/Icon";
import Select from "@/components/Select";

export type CatOption = { slug: string; label: string; parent?: string };

/**
 * Filter bar above the orders list: a search box that searches as you type, and category and year
 * dropdowns that apply as soon as one is picked. Every change rewrites the address (back to page 1) and
 * the list follows; nothing needs an "apply" button.
 */
export default function OrdersFilters({
  cats,
  years,
  labels,
}: {
  cats: CatOption[];
  years: number[];
  labels: { search: string; clear: string; category: string; allCategories: string; subCategory: string; year: string; allYears: string };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = params.get("q") ?? "";
  const [value, setValue] = useState(current);
  const [pending, startTransition] = useTransition();

  // while new results load, the list below fades (see .orders-list in globals.css) so the wait is visible
  useEffect(() => {
    document.documentElement.toggleAttribute("data-orders-pending", pending);
    return () => document.documentElement.removeAttribute("data-orders-pending");
  }, [pending]);
  const input = useRef<HTMLInputElement>(null);

  // follow the address when it changes from elsewhere (a removed filter tag, the back button, "clear")
  const [seen, setSeen] = useState(current);
  if (seen !== current) {
    setSeen(current);
    setValue(current);
  }

  const go = (over: Record<string, string>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(over)) {
      if (v.trim()) next.set(k, v.trim());
      else next.delete(k);
    }
    next.delete("page");
    const qs = next.toString();
    startTransition(() => router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false }));
  };

  useEffect(() => {
    if (value.trim() === current.trim()) return;
    const t = window.setTimeout(() => go({ q: value }), 300);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // the address holds one category: a main one, or a sub-category (then its parent is the main one)
  const chosen = cats.find((c) => c.slug === (params.get("cat") ?? ""));
  const main = chosen?.parent ?? chosen?.slug ?? "";
  const sub = chosen?.parent ? chosen.slug : "";
  const subs = cats.filter((c) => c.parent && c.parent === main);

  const box = "rounded-lg border border-line bg-white transition-colors focus-within:border-brand";
  const trigger = "field-bare rounded-lg py-3.5 pl-4 pr-4 text-base";

  return (
    <>
    <form
      role="search"
      action={pathname}
      onSubmit={(e) => {
        e.preventDefault();
        go({ q: value });
      }}
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_14rem_14rem_10rem]"
    >
      <div className={`flex items-center gap-3 px-4 sm:col-span-2 lg:col-span-1 ${box}`}>
        <span aria-hidden className={`shrink-0 ${pending ? "animate-pulse text-brand" : "text-muted"}`}>
          <Icon name="search" size={20} />
        </span>
        <label htmlFor="orders-q" className="sr-only">
          {labels.search}
        </label>
        <input
          ref={input}
          id="orders-q"
          name="q"
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={labels.search}
          autoComplete="off"
          className="field-bare min-w-0 flex-1 bg-transparent py-3.5 text-base [&::-webkit-search-cancel-button]:hidden"
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              setValue("");
              go({ q: "" });
              input.current?.focus();
            }}
            className="-mr-1 grid size-8 shrink-0 place-items-center rounded-full text-lg leading-none text-muted hover:bg-paper hover:text-brand"
            aria-label={labels.clear}
          >
            ×
          </button>
        )}
      </div>
      <div className={box}>
        <Select
          id="orders-cat"
          label={labels.category}
          value={main}
          onChange={(v) => go({ cat: v })}
          placeholder={labels.allCategories}
          options={cats.filter((c) => !c.parent).map((c) => ({ value: c.slug, label: c.label }))}
          className={trigger}
        />
      </div>

      <div className={box}>
        <Select
          key={main}
          id="orders-subcat"
          label={labels.subCategory}
          value={sub}
          onChange={(v) => go({ cat: v || main })}
          placeholder={labels.subCategory}
          disabled={subs.length === 0}
          options={subs.map((c) => ({ value: c.slug, label: c.label }))}
          className={trigger}
        />
      </div>

      <div className={box}>
        <Select
          id="orders-year"
          label={labels.year}
          value={params.get("year") ?? ""}
          onChange={(v) => go({ year: v })}
          placeholder={labels.allYears}
          options={years.map((y) => ({ value: String(y), label: String(y) }))}
          className={trigger}
        />
      </div>
    </form>
    <div aria-hidden className={`orders-bar mt-3 h-0.5 overflow-hidden rounded-full ${pending ? "opacity-100" : "opacity-0"}`} />
    </>
  );
}
