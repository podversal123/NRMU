"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

/**
 * Brings the branch named in the address (?branch=<id>, from the header's Divisions menu) into view on a division
 * page, marks its line and opens its whole committee. It waits a moment so the page has its final layout first;
 * scrolling to a #hash straight away landed in the wrong place while the page was still filling in.
 */
export default function BranchTarget() {
  const id = useSearchParams().get("branch");
  useEffect(() => {
    document.querySelectorAll("[data-picked]").forEach((e) => e.removeAttribute("data-picked"));
    const el = id ? document.getElementById(`branch-${id}`) : null;
    if (!el) return;
    el.setAttribute("data-picked", "");
    const more = el instanceof HTMLDetailsElement ? el : el.querySelector("details");
    if (more) more.open = true;
    const t = setTimeout(() => el.scrollIntoView({ block: "start" }), 80);
    return () => clearTimeout(t);
  }, [id]);
  return null;
}
