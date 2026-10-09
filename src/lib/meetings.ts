import "server-only";
import { cache } from "react";
import { sql } from "drizzle-orm";
import { getDb } from "@/db";

export const MODES = [
  { value: "online", label: "Online (video call)" },
  { value: "in_person", label: "In person" },
  { value: "hybrid", label: "Both: in person and online" },
] as const;

export const RSVPS = [
  { value: "pending", label: "No reply" },
  { value: "yes", label: "Coming" },
  { value: "maybe", label: "Maybe" },
  { value: "no", label: "Not coming" },
] as const;

export const modeLabel = (v: string) => MODES.find((m) => m.value === v)?.label ?? v;

/** "2026-11-02T10:30" typed in India time, stored as a real point in time. */
export const fromIst = (v: string) => (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v) ? new Date(`${v}:00+05:30`) : null);

/** The same instant written the way a datetime field wants it, in India time. */
export const toIst = (d: Date | null | undefined) => (d ? new Date(d.getTime() + 5.5 * 3600 * 1000).toISOString().slice(0, 16) : "");

const IST = "Asia/Kolkata";
export const istDay = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: IST });

export const fmtWhen = (d: Date) => d.toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: IST });
export const fmtTime = (d: Date) => d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: IST });
export const fmtDay = (d: Date) => d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: IST });

export type MeetingState = "live" | "upcoming" | "ended" | "completed" | "cancelled";

/** What a meeting is right now. "Live" and "ended" follow the clock; the rest is what the super admin set. */
export function meetingState(m: { status: string; startsAt: Date; endsAt: Date }, now: Date): MeetingState {
  if (m.status === "cancelled") return "cancelled";
  if (m.status === "completed") return "completed";
  if (now >= m.startsAt && now <= m.endsAt) return "live";
  return now < m.startsAt ? "upcoming" : "ended";
}

/** "in 3 hours", "tomorrow", "2 days ago". */
export function relative(target: Date, now: Date) {
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const mins = Math.round((target.getTime() - now.getTime()) / 60000);
  const abs = Math.abs(mins);
  if (abs < 60) return rtf.format(mins, "minute");
  if (abs < 60 * 24) return rtf.format(Math.round(mins / 60), "hour");
  return rtf.format(Math.round(mins / 1440), "day");
}

/** The "meetings.video_enabled" setting: video rooms are only made when it is "1". It stays "0" until the video account can take calls. */
export async function videoEnabled() {
  const r = (await getDb().execute(sql`select value_en as v from site_settings where key = 'meetings.video_enabled'`)) as unknown as { rows?: { v: string }[] } & { v: string }[];
  return (r.rows ?? r)[0]?.v?.trim() === "1";
}

/** Reminder offsets in minutes, from the "meetings.reminder_minutes" setting (e.g. "1440,60,15"). */
export async function reminderOffsets() {
  const r = (await getDb().execute(sql`select value_en as v from site_settings where key = 'meetings.reminder_minutes'`)) as unknown as { rows?: { v: string }[] } & { v: string }[];
  const raw = (r.rows ?? r)[0]?.v ?? "";
  return [...new Set(raw.split(",").map((x) => Math.round(Number(x))).filter((n) => Number.isFinite(n) && n > 0 && n <= 60 * 24 * 30))].sort((a, b) => b - a);
}

export type MeetingAlert = { id: number; titleEn: string; startsAt: Date; endsAt: Date; mode: string; group: "live" | "today" | "soon" };

/**
 * What the super admin needs to know right now: meetings in progress, meetings later today,
 * and the ones in the next 7 days. One query per request, shared by the sidebar and the dashboard.
 */
export const getMeetingAlerts = cache(async (): Promise<MeetingAlert[]> => {
  const r = (await getDb().execute(sql`
    select id, title_en, mode, (extract(epoch from starts_at) * 1000)::bigint as s_ms, (extract(epoch from ends_at) * 1000)::bigint as e_ms from meetings
    where status = 'scheduled' and ends_at >= now() and starts_at < now() + interval '7 days'
    order by starts_at limit 20`)) as unknown as { rows?: Record<string, unknown>[] } & Record<string, unknown>[];
  const now = new Date();
  const today = istDay(now);
  return (r.rows ?? r).map((x) => {
    const startsAt = new Date(Number(x.s_ms));
    const endsAt = new Date(Number(x.e_ms));
    const group: MeetingAlert["group"] = now >= startsAt ? "live" : istDay(startsAt) === today ? "today" : "soon";
    return { id: Number(x.id), titleEn: String(x.title_en), startsAt, endsAt, mode: String(x.mode), group };
  });
});
