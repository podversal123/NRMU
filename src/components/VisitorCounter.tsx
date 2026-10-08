"use client";

import { useEffect, useState } from "react";

/** Counts one visit per browser session and shows the running total. */
export default function VisitorCounter({ label, locale }: { label: string; locale: string }) {
  const [total, setTotal] = useState<number | null>(null);
  useEffect(() => {
    let counted = false;
    try {
      counted = sessionStorage.getItem("nrmu-counted") === "1";
      if (!counted) sessionStorage.setItem("nrmu-counted", "1");
    } catch {}
    fetch("/api/visit", { method: counted ? "GET" : "POST" })
      .then((r) => r.json())
      .then((d: { total: number }) => setTotal(d.total))
      .catch(() => {});
  }, []);
  if (total === null) return null;
  return (
    <span>
      {label}: <b className="font-semibold text-light">{total.toLocaleString(locale)}</b>
    </span>
  );
}
