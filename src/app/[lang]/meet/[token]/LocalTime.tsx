"use client";

import { useEffect, useState } from "react";

/**
 * Shows the meeting in the visitor's own time zone when it is not India's, so a person in London or Dubai
 * sees their own clock time. Nothing is shown to visitors in India (they already see IST above), and nothing
 * is rendered on the server because the server does not know the visitor's time zone.
 */
export default function LocalTime({ start, end, locale, label }: { start: string; end: string; locale: string; label: string }) {
  const [text, setText] = useState("");

  useEffect(() => {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!zone || zone === "Asia/Kolkata" || zone === "Asia/Calcutta") return;
    const day = new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
    const clock = new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit", timeZoneName: "short" });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the zone is only known in the browser
    setText(`${day.format(new Date(start))} – ${clock.format(new Date(end))}`);
  }, [start, end, locale]);

  if (!text) return null;
  return (
    <dd className="mt-1 text-muted">
      {label}: <span className="font-medium text-ink">{text}</span>
    </dd>
  );
}
