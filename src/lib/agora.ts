import "server-only";
import { RtcRole, RtcTokenBuilder } from "agora-token";

/**
 * The only file that knows about the video service (Agora). A meeting's call is a "channel" named after the meeting;
 * nobody can enter it without a token made here, and a token is made only for the super admin or for an invitee
 * who opened their own personal link. The App Certificate stays on the server and is never sent to a browser.
 */
export const videoConfigured = () => Boolean(process.env.AGORA_APP_ID && process.env.AGORA_APP_CERTIFICATE);

/** The public App ID the browser needs to reach the service (it is not a secret). */
export const agoraAppId = () => process.env.AGORA_APP_ID ?? "";

export const channelFor = (meetingId: number) => `nrmu-${meetingId}`;

/** Invitees use their own id as the call id; hosts start at 1,000,000,000 so the two can never collide. */
export const HOST_UID_BASE = 1_000_000_000;
export const inviteeUid = (inviteeId: number) => inviteeId;
export const hostUid = (adminId: number) => HOST_UID_BASE + adminId;

const HOUR = 3600;

/** A personal way into one meeting's call. Valid until an hour after the meeting ends. */
export function createCallToken(opts: { meetingId: number; uid: number; endsAt: Date }) {
  const appId = process.env.AGORA_APP_ID;
  const certificate = process.env.AGORA_APP_CERTIFICATE;
  if (!appId || !certificate) throw new Error("The video service is not set up (AGORA_APP_ID / AGORA_APP_CERTIFICATE are missing).");
  const secondsLeft = Math.max(HOUR, Math.floor((opts.endsAt.getTime() - Date.now()) / 1000) + HOUR);
  return RtcTokenBuilder.buildTokenWithUid(appId, certificate, channelFor(opts.meetingId), opts.uid, RtcRole.PUBLISHER, secondsLeft, secondsLeft);
}
