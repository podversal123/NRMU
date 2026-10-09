import "server-only";
import { randomBytes } from "node:crypto";

/**
 * The only file that talks to the video service (Daily). Everything else asks for "a room",
 * "a way in for this person" or "the recording", so another service could be swapped in here.
 * The API key stays on the server and is never sent to a browser.
 */
const API = "https://api.daily.co/v1";

export class DailyError extends Error {
  constructor(
    readonly status: number,
    readonly info: string,
  ) {
    super(info);
  }
  /** The account's plan does not allow what was asked for (for example recording). */
  get planLimited() {
    return /current plan/i.test(this.info);
  }
}

export const videoConfigured = () => Boolean(process.env.DAILY_API_KEY);

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function call<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const key = process.env.DAILY_API_KEY;
  if (!key) throw new DailyError(0, "The video service is not set up (DAILY_API_KEY is missing).");
  let res: Response;
  // The service allows about 20 requests a second. When many people join at the same moment it answers 429
  // ("slow down"); waiting a short, slightly random time and asking again lets them all through.
  for (let attempt = 0; ; attempt++) {
    res = await fetch(`${API}${path}`, {
      method: init.method ?? "GET",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    if (res.status !== 429 || attempt >= 4) break;
    await wait(250 * 2 ** attempt + Math.random() * 250);
  }
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new DailyError(res.status, String(data.info ?? data.error ?? res.statusText));
  return data as T;
}

const secs = (d: Date) => Math.floor(d.getTime() / 1000);
const HOUR = 3600;

export type RoomPlan = { startsAt: Date; endsAt: Date; recording: boolean };
export type Room = { name: string; url: string; recording: boolean };

/**
 * A private room: nobody gets in without a personal token, or without the host letting them in from the waiting room.
 * The room opens an hour before the meeting (so the host can prepare) and closes two hours after the end.
 */
function roomProperties(plan: RoomPlan, withRecording: boolean) {
  return {
    nbf: secs(plan.startsAt) - HOUR,
    exp: secs(plan.endsAt) + 2 * HOUR,
    eject_at_room_exp: true,
    enable_knocking: true,
    enable_prejoin_ui: true,
    enable_chat: true,
    enable_screenshare: true,
    ...(withRecording ? { enable_recording: "cloud" } : {}),
  };
}

/** Runs `attempt` with recording; if the plan refuses recording, runs it again without and says so. */
async function withRecordingFallback<T>(wanted: boolean, attempt: (recording: boolean) => Promise<T>): Promise<{ value: T; recording: boolean }> {
  try {
    return { value: await attempt(wanted), recording: wanted };
  } catch (e) {
    if (wanted && e instanceof DailyError && e.planLimited) return { value: await attempt(false), recording: false };
    throw e;
  }
}

export async function createRoom(plan: RoomPlan): Promise<Room> {
  const name = `nrmu-${randomBytes(8).toString("hex")}`; // unguessable
  const { value, recording } = await withRecordingFallback(plan.recording, (rec) =>
    call<{ name: string; url: string }>("/rooms", { method: "POST", body: { name, privacy: "private", properties: roomProperties(plan, rec) } }),
  );
  return { name: value.name, url: value.url, recording };
}

/** Moves an existing room to a new time. */
export async function updateRoom(name: string, plan: RoomPlan): Promise<{ recording: boolean }> {
  const { recording } = await withRecordingFallback(plan.recording, (rec) => call(`/rooms/${encodeURIComponent(name)}`, { method: "POST", body: { properties: roomProperties(plan, rec) } }));
  return { recording };
}

export async function deleteRoom(name: string) {
  try {
    await call(`/rooms/${encodeURIComponent(name)}`, { method: "DELETE" });
  } catch (e) {
    if (!(e instanceof DailyError && e.status === 404)) throw e; // already gone is fine
  }
}

/** A personal way into the room. `userId` ties what happens in the call back to a person (36 characters at most). */
export async function createToken(opts: { room: string; name: string; userId: string; owner: boolean; startsAt: Date; endsAt: Date; record: boolean }) {
  const properties: Record<string, unknown> = {
    room_name: opts.room,
    user_name: opts.name.slice(0, 80),
    user_id: opts.userId.slice(0, 36),
    is_owner: opts.owner,
    // the host may come in early; guests from 15 minutes before the start
    nbf: opts.owner ? secs(opts.startsAt) - HOUR : secs(opts.startsAt) - 15 * 60,
    exp: secs(opts.endsAt) + HOUR,
    eject_at_token_exp: true,
  };
  // The host's arrival starts the recording, so nobody has to remember to press record.
  if (opts.owner && opts.record) properties.start_cloud_recording = true;
  const res = await call<{ token: string }>("/meeting-tokens", { method: "POST", body: { properties } });
  return res.token;
}

export type RecordingInfo = { id: string; duration: number | null; status: string; startTs: number | null };

/** Recordings made in a room (used when the webhook has not told us yet). */
export async function listRecordings(roomName: string): Promise<RecordingInfo[]> {
  const res = await call<{ data?: { id: string; duration?: number; status?: string; start_ts?: number }[] }>(`/recordings?room_name=${encodeURIComponent(roomName)}`);
  return (res.data ?? []).map((r) => ({ id: r.id, duration: r.duration ?? null, status: r.status ?? "", startTs: r.start_ts ?? null }));
}

/** A temporary address to watch or download one recording. Valid for one hour, so it is made fresh every time. */
export async function recordingLink(id: string) {
  const res = await call<{ download_link: string }>(`/recordings/${encodeURIComponent(id)}/access-link?valid_for_secs=3600`);
  return res.download_link;
}
