import type { Lang } from "./i18n";

const locale = (lang: Lang) => (lang === "hi" ? "hi-IN" : "en-IN");

export const dayIst = (iso: string, lang: Lang) =>
  new Intl.DateTimeFormat(locale(lang), { dateStyle: "long", timeZone: "Asia/Kolkata" }).format(new Date(iso));

export const timeIst = (iso: string, lang: Lang) =>
  new Intl.DateTimeFormat(locale(lang), { timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(iso));

/** A moment in India time, in the visitor's language: "9 October 2026, 3:00 pm IST". */
export const whenIst = (iso: string, lang: Lang) => `${dayIst(iso, lang)}, ${timeIst(iso, lang)} IST`;
