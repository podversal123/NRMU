"use client";

import { useEffect, useId, useRef, useState } from "react";

/** `parent` (the parent option's value) makes the list a tree: children fold under their parent. */
export type SelectOption = { value: string; label: string; hint?: string; parent?: string };

/**
 * The site's dropdown, used in place of the browser's own <select> so it looks the same everywhere.
 * Works with the mouse and the keyboard (arrows, Home/End, Enter, Esc, and typing the first letters),
 * and carries its value in a hidden input so it submits with a form like a normal field. Options that
 * name a parent are shown as a tree: a parent opens and closes with its arrow (or Right/Left keys), and
 * the branch holding the chosen option starts open.
 */
export default function Select({
  id,
  name,
  options,
  value,
  defaultValue = "",
  onChange,
  placeholder,
  label,
  submitOnChange = false,
  clearable = true,
  disabled = false,
  className = "",
}: {
  id?: string;
  name?: string;
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** shown when nothing is chosen; also the first option, meaning "none" */
  placeholder?: string;
  /** accessible name when there is no visible <label for> */
  label?: string;
  submitOnChange?: boolean;
  /** false for a required choice: the placeholder is only a prompt, not an option in the list */
  clearable?: boolean;
  /** also disabled on its own while there are no options, e.g. branches before a division is picked */
  disabled?: boolean;
  className?: string;
}) {
  const auto = useId();
  const buttonId = id ?? `sel-${auto}`;
  const listId = `${buttonId}-list`;
  const all: SelectOption[] = placeholder !== undefined && clearable ? [{ value: "", label: placeholder }, ...options] : options;

  const [inner, setInner] = useState(defaultValue);
  const current = value ?? inner;
  const [open, setOpen] = useState(false);
  // the highlighted row; -1 means none, so opening the list does not paint the first option as if it were picked
  const [active, setActive] = useState(-1);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const wrap = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const hidden = useRef<HTMLInputElement>(null);
  const typed = useRef({ text: "", at: 0 });

  const selected = all.find((o) => o.value === current);
  const parents = new Set(all.filter((o) => o.parent).map((o) => o.parent as string));
  const visible = all.filter((o) => !o.parent || expanded.has(o.parent));
  const lastChild = new Set(
    [...parents].map((p) => {
      const kids = all.filter((o) => o.parent === p);
      return kids[kids.length - 1]?.value;
    }),
  );

  const openList = () => {
    // start with the chosen option's branch open
    const start = new Set(expanded);
    if (selected?.parent) start.add(selected.parent);
    setExpanded(start);
    const shown = all.filter((o) => !o.parent || start.has(o.parent));
    setActive(shown.findIndex((o) => o.value === current && o.value !== ""));
    setOpen(true);
  };

  const toggle = (v: string, to?: boolean) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (to ?? !next.has(v)) next.add(v);
      else next.delete(v);
      return next;
    });
  };

  const choose = (v: string) => {
    setOpen(false);
    if (v === current) return;
    if (value === undefined) setInner(v);
    onChange?.(v);
    if (submitOnChange && hidden.current) {
      hidden.current.value = v;
      hidden.current.form?.requestSubmit();
    }
  };

  // close when clicking anywhere else
  useEffect(() => {
    if (!open) return;
    const off = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", off);
    return () => document.removeEventListener("pointerdown", off);
  }, [open]);

  // the list always opens below the field; if it would run past the bottom of the window, scroll the page just
  // enough to show all of it (opening upwards would slide it under the sticky header)
  useEffect(() => {
    if (!open || !list.current) return;
    const over = list.current.getBoundingClientRect().bottom - window.innerHeight + 16;
    if (over > 0) window.scrollBy({ top: over });
  }, [open]);

  // keep the highlighted option in view
  useEffect(() => {
    if (open && active >= 0) list.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const onKey = (e: React.KeyboardEvent) => {
    const last = visible.length - 1;
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        openList();
      }
      return;
    }
    const o = visible[active];
    if (e.key === "ArrowDown") setActive((a) => Math.min(last, a + 1));
    else if (e.key === "ArrowUp") setActive((a) => Math.max(0, a - 1));
    else if (e.key === "Home") setActive(0);
    else if (e.key === "End") setActive(last);
    else if (e.key === "ArrowRight" && o && parents.has(o.value)) {
      if (expanded.has(o.value)) setActive(active + 1);
      else toggle(o.value, true);
    } else if (e.key === "ArrowLeft" && o) {
      if (parents.has(o.value) && expanded.has(o.value)) toggle(o.value, false);
      else if (o.parent) setActive(visible.findIndex((x) => x.value === o.parent));
    } else if (e.key === "Enter" || e.key === " ") {
      if (o) choose(o.value);
    } else if (e.key === "Escape" || e.key === "Tab") {
      setOpen(false);
      if (e.key === "Tab") return;
    } else if (e.key.length === 1) {
      // type-ahead: jump to the first shown option starting with what was typed
      const now = Date.now();
      typed.current = { text: (now - typed.current.at < 700 ? typed.current.text : "") + e.key.toLowerCase(), at: now };
      const hit = visible.findIndex((x) => x.label.toLowerCase().trim().startsWith(typed.current.text));
      if (hit >= 0) setActive(hit);
      return;
    } else return;
    e.preventDefault();
  };

  const tree = parents.size > 0;

  return (
    <div ref={wrap} className="relative">
      {name && <input ref={hidden} type="hidden" name={name} value={current} />}
      <button
        id={buttonId}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={label}
        aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
        disabled={disabled || all.length === 0}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKey}
        className={`flex w-full items-center justify-between gap-3 text-start disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      >
        <span className={`truncate ${selected && selected.value !== "" ? "text-ink" : "text-muted"}`}>{selected?.label ?? placeholder ?? ""}</span>
        <svg aria-hidden viewBox="0 0 20 20" className={`size-4 shrink-0 text-muted transition-transform ${open ? "rotate-180 text-brand" : ""}`}>
          <path d="M5 7.5l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <ul
          ref={list}
          id={listId}
          role="listbox"
          aria-labelledby={buttonId}
          onPointerLeave={(e) => {
            if (e.pointerType === "mouse") setActive(-1);
          }}
          className={`absolute right-0 top-full z-30 mt-1.5 max-h-80 w-max min-w-full max-w-[min(26rem,90vw)] overflow-y-auto overscroll-contain rounded-lg border border-line bg-white shadow-[0_18px_40px_-16px_rgba(21,22,26,0.35)] [scrollbar-color:var(--line)_transparent] [scrollbar-width:thin]`}
        >
          {visible.map((o, i) => {
            const on = o.value === current;
            const isParent = parents.has(o.value);
            const isOpen = expanded.has(o.value);
            return (
              <li
                key={o.value || "__none"}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={on}
                onPointerEnter={() => setActive(i)}
                onClick={() => choose(o.value)}
                className={`relative flex cursor-pointer items-center gap-2 py-2 pr-3 text-[0.95rem] ${o.parent ? "pl-11" : "pl-2"} ${
                  i === active ? "bg-brand text-white" : on ? "text-brand" : o.parent ? "text-ink/85" : "text-ink"
                } ${on ? "font-semibold" : ""}`}
              >
                {o.parent && (
                  // tree lines: a stem down from the parent (stopping half way at the last child) and a short branch to this row
                  <>
                    <span aria-hidden className={`absolute left-[1.15rem] top-0 border-l border-line ${lastChild.has(o.value) ? "h-1/2" : "h-full"}`} />
                    <span aria-hidden className="absolute left-[1.15rem] top-1/2 w-3.5 border-t border-line" />
                  </>
                )}
                {tree && !o.parent && (
                  <span
                    aria-hidden
                    onClick={(e) => {
                      if (!isParent) return;
                      e.stopPropagation();
                      toggle(o.value);
                    }}
                    className={`grid size-6 shrink-0 place-items-center rounded ${isParent ? (i === active ? "text-white hover:bg-white/20" : "text-muted hover:bg-line/60 hover:text-brand") : ""}`}
                  >
                    {isParent && (
                      <svg viewBox="0 0 20 20" className={`size-3.5 transition-transform ${isOpen ? `rotate-90 ${i === active ? "" : "text-brand"}` : ""}`}>
                        <path d="M7.5 5l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                )}
                {!tree && (
                  <span aria-hidden className={`w-4 shrink-0 pl-1 ${i === active ? "" : "text-brand"} ${on ? "" : "invisible"}`}>
                    ✓
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate">{o.label}</span>
                {o.hint && (
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[0.7rem] font-normal tabular-nums ${i === active ? "bg-white/20 text-white" : on ? "bg-brand text-white" : "bg-paper text-muted"}`}>{o.hint}</span>
                )}
                {tree && on && (
                  <span aria-hidden className={`shrink-0 ${i === active ? "" : "text-brand"}`}>
                    ✓
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
