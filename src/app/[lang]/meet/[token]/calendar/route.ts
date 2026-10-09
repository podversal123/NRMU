import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { isLang } from "@/lib/i18n";
import { limited } from "@/lib/rate-limit";

const TOKEN = /^[0-9a-f]{64}$/;

/** RFC 5545 text: backslash, semicolon, comma and line breaks are written with a backslash. */
const esc = (v: string) => v.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
/** Lines longer than 75 bytes are folded onto the next line, started with a space. */
const fold = (line: string) => {
  const out: string[] = [];
  let cur = "";
  for (const ch of line) {
    if (Buffer.byteLength(cur + ch) > (out.length ? 74 : 75)) {
      out.push(cur);
      cur = "";
    }
    cur += ch;
  }
  out.push(cur);
  return out.join("\r\n ");
};
const utc = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/**
 * "Add to calendar" for one invitee. A calendar file holds the time as an exact moment (UTC), so every calendar
 * app shows it in the viewer's own time zone, anywhere in the world, with a reminder a day and an hour before.
 */
export async function GET(request: Request, { params }: { params: Promise<{ lang: string; token: string }> }) {
  const { lang, token } = await params;
  if (!isLang(lang) || !TOKEN.test(token)) return new NextResponse("Not found", { status: 404 });
  if (await limited("calendar", { perAddress: 60, perSecret: { id: token, max: 20 }, windowSeconds: 600 })) return new NextResponse("Too many requests", { status: 429 });

  const [row] = await getDb()
    .select({ invitee: schema.meetingInvitees, m: schema.meetings })
    .from(schema.meetingInvitees)
    .innerJoin(schema.meetings, eq(schema.meetings.id, schema.meetingInvitees.meetingId))
    .where(eq(schema.meetingInvitees.joinToken, token))
    .limit(1);
  if (!row || row.m.status === "cancelled") return new NextResponse("Not found", { status: 404 });
  const { m } = row;

  const link = `${new URL(request.url).origin}/${lang}/meet/${token}`;
  const title = (lang === "hi" && m.titleHi) || m.titleEn;
  const agenda = (lang === "hi" && m.agendaHi) || m.agendaEn || "";
  const venue = m.mode === "online" ? "Online (video call)" : (lang === "hi" && m.venueHi) || m.venueEn || "";
  const description = [agenda && `${agenda}`, `${link}`].filter(Boolean).join("\n\n");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//NRMU//Meetings//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:nrmu-meeting-${m.id}-${row.invitee.id}@nrmu.net`,
    `DTSTAMP:${utc(new Date())}`,
    `DTSTART:${utc(m.startsAt)}`,
    `DTEND:${utc(m.endsAt)}`,
    `SUMMARY:${esc(title)}`,
    `DESCRIPTION:${esc(description)}`,
    ...(venue ? [`LOCATION:${esc(venue)}`] : []),
    `URL:${link}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${esc(title)}`,
    "TRIGGER:-P1D",
    "END:VALARM",
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${esc(title)}`,
    "TRIGGER:-PT1H",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return new NextResponse(lines.map(fold).join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="nrmu-meeting-${m.id}.ics"`,
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}
