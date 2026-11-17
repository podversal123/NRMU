"use client";

import type { IAgoraRTCClient, IAgoraRTCRemoteUser, ICameraVideoTrack, ILocalVideoTrack, IMicrophoneAudioTrack } from "agora-rtc-sdk-ng";
import { useCallback, useEffect, useRef, useState } from "react";

type Labels = { loading: string; left: string; again: string; back: string; error: string };

/** Words on the call controls. Hindi where we have it, English for every other language. */
const WORDS = {
  en: {
    join: "Join now",
    ready: "Ready to join?",
    readyHint: "Your camera and microphone are asked for when you press the button.",
    mic: "Microphone",
    cam: "Camera",
    on: "on",
    off: "off",
    share: "Share screen",
    stopShare: "Stop sharing",
    leave: "Leave",
    you: "You",
    host: "Host",
    guest: "Guest",
    alone: "You are the only one here. Others will appear when they join.",
    people: "in the call",
    noDevice: "Your camera or microphone could not be used. You are in the call and can still watch and listen.",
    noShare: "Screen sharing is not available in this browser.",
    sharing: "is sharing the screen",
    audioBlocked: "Sound is blocked by the browser. Press here to hear the others.",
    badKey: "The video service refused this connection. Please tell the office.",
  },
  hi: {
    join: "अभी जुड़ें",
    ready: "जुड़ने के लिए तैयार?",
    readyHint: "बटन दबाने पर कैमरा और माइक्रोफ़ोन की अनुमति माँगी जाएगी।",
    mic: "माइक्रोफ़ोन",
    cam: "कैमरा",
    on: "चालू",
    off: "बंद",
    share: "स्क्रीन साझा करें",
    stopShare: "साझा करना रोकें",
    leave: "बाहर निकलें",
    you: "आप",
    host: "संचालक",
    guest: "अतिथि",
    alone: "अभी आप अकेले हैं। दूसरे लोग जुड़ते ही दिखेंगे।",
    people: "कॉल में",
    noDevice: "आपका कैमरा या माइक्रोफ़ोन इस्तेमाल नहीं हो सका। आप कॉल में हैं और देख-सुन सकते हैं।",
    noShare: "इस ब्राउज़र में स्क्रीन साझा नहीं हो सकती।",
    sharing: "स्क्रीन साझा कर रहे हैं",
    audioBlocked: "ब्राउज़र ने आवाज़ रोक दी है। दूसरों को सुनने के लिए यहाँ दबाएँ।",
    badKey: "वीडियो सेवा ने यह कनेक्शन नहीं माना। कृपया कार्यालय को बताएँ।",
  },
};

type State = "ready" | "joining" | "in" | "left" | "error";

/** A person's picture in the grid. The video is played by the service's own player into this box. */
function Tile({ track, name, tag, muted, off }: { track: ICameraVideoTrack | ILocalVideoTrack | IAgoraRTCRemoteUser["videoTrack"] | null | undefined; name: string; tag?: string; muted: boolean; off: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = box.current;
    if (!el || !track) return;
    track.play(el, { fit: "contain" });
    return () => track.stop();
  }, [track]);
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <div className="relative aspect-video overflow-hidden rounded bg-[#1d1d1d]">
      <div ref={box} className="absolute inset-0" />
      {(!track || off) && (
        <div className="absolute inset-0 grid place-items-center bg-[#1d1d1d]">
          <span aria-hidden="true" className="grid h-16 w-16 place-items-center rounded-full bg-brand text-2xl font-semibold text-white sm:h-20 sm:w-20 sm:text-3xl">
            {initial}
          </span>
        </div>
      )}
      <p className="absolute bottom-2 left-2 right-2 truncate rounded bg-black/60 px-2 py-1 text-sm text-white">
        {muted && <span aria-label="muted">🔇 </span>}
        {name}
        {tag ? ` (${tag})` : ""}
      </p>
    </div>
  );
}

/**
 * The call screen, built on Agora's video SDK: everyone's picture in a grid, microphone, camera, screen share and leave.
 * The server gives this component a personal token; it is the only way in. This component also tells the site when
 * an invitee came in and left, which is the attendance record.
 */
export default function VideoCall({
  appId,
  channel,
  token,
  uid,
  selfName,
  names,
  lang,
  backHref,
  presenceToken,
  labels,
}: {
  appId: string;
  channel: string;
  token: string;
  uid: number;
  selfName: string;
  /** Who is who in this meeting, by call id. */
  names: Record<number, string>;
  lang: string;
  backHref: string;
  /** The invitee's own secret, used to record attendance. Not given for the host. */
  presenceToken?: string;
  labels: Labels;
}) {
  const w = lang === "hi" ? WORDS.hi : WORDS.en;
  const [state, setState] = useState<State>("ready");
  const [remotes, setRemotes] = useState<IAgoraRTCRemoteUser[]>([]);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [deviceProblem, setDeviceProblem] = useState(false);
  const [shareProblem, setShareProblem] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [reason, setReason] = useState("");

  const client = useRef<IAgoraRTCClient | null>(null);
  // The tracks live in a ref (so cleanup can reach them) and in state (so the screen follows them).
  const tracks = useRef<{ mic: IMicrophoneAudioTrack | null; cam: ICameraVideoTrack | null; screen: ILocalVideoTrack | null }>({ mic: null, cam: null, screen: null });
  const [shown, setShown] = useState<{ mic: IMicrophoneAudioTrack | null; cam: ICameraVideoTrack | null; screen: ILocalVideoTrack | null }>({ mic: null, cam: null, screen: null });
  const setTracks = useCallback((part: Partial<typeof tracks.current>) => {
    tracks.current = { ...tracks.current, ...part };
    setShown(tracks.current);
  }, []);
  const joined = useRef(false);
  const alive = useRef(true);

  const ping = useCallback(
    (event: "joined" | "left") => {
      if (!presenceToken) return;
      fetch("/api/meet/presence", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token: presenceToken, event }), keepalive: true }).catch(() => {});
    },
    [presenceToken],
  );

  /** Lets go of the camera, the microphone and the connection. Safe to call twice. */
  const hangUp = useCallback(async () => {
    const c = client.current;
    client.current = null;
    const t = tracks.current;
    for (const track of [t.mic, t.cam, t.screen]) {
      try {
        track?.stop();
        track?.close();
      } catch {}
    }
    tracks.current = { mic: null, cam: null, screen: null };
    setShown(tracks.current);
    if (joined.current) {
      joined.current = false;
      ping("left");
    }
    try {
      c?.removeAllListeners();
      await c?.leave();
    } catch {}
  }, [ping]);

  useEffect(() => {
    alive.current = true;
    const onHide = () => {
      if (joined.current) ping("left");
    };
    window.addEventListener("pagehide", onHide);
    return () => {
      alive.current = false;
      window.removeEventListener("pagehide", onHide);
      void hangUp();
    };
  }, [hangUp, ping]);

  const start = useCallback(async () => {
    setState("joining");
    setReason("");
    setDeviceProblem(false);
    setShareProblem(false);
    setSharing(false);
    setMicOn(true);
    setCamOn(true);
    setRemotes([]);
    try {
      const AgoraRTC = (await import("agora-rtc-sdk-ng")).default;
      if (!alive.current) return;
      AgoraRTC.setLogLevel(3); // warnings and errors only
      AgoraRTC.onAudioAutoplayFailed = () => alive.current && setAudioBlocked(true);
      const c = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
      client.current = c;
      const refresh = () => alive.current && setRemotes([...c.remoteUsers]);
      c.on("user-published", async (user, type) => {
        try {
          await c.subscribe(user, type);
          if (type === "audio") user.audioTrack?.play();
        } catch {}
        refresh();
      });
      c.on("user-unpublished", refresh);
      c.on("user-joined", refresh);
      c.on("user-left", refresh);
      c.on("connection-state-change", (now, _prev, why) => {
        if (now === "DISCONNECTED" && joined.current && why !== "LEAVE") {
          // the token ran out or the person was removed: the call is over for them
          void hangUp().then(() => alive.current && setState("left"));
        }
      });
      await c.join(appId, channel, token, uid);
      if (!alive.current) return void hangUp();
      joined.current = true;
      ping("joined");
      setState("in");
      refresh();

      // Each device is asked for on its own, so a missing camera does not stop the microphone.
      const published = [];
      try {
        const m = await AgoraRTC.createMicrophoneAudioTrack();
        setTracks({ mic: m });
        published.push(m);
      } catch {
        setMicOn(false);
        setDeviceProblem(true);
      }
      try {
        const v = await AgoraRTC.createCameraVideoTrack({ encoderConfig: "480p_2" });
        setTracks({ cam: v });
        published.push(v);
      } catch {
        setCamOn(false);
        setDeviceProblem(true);
      }
      if (!alive.current) return void hangUp();
      if (published.length) await c.publish(published);
    } catch (e) {
      const code = (e as { code?: string } | undefined)?.code ?? "";
      await hangUp();
      if (!alive.current) return;
      setReason(code === "INVALID_VENDOR_KEY" || code === "INVALID_OPERATION" || /token|appid/i.test(code) ? w.badKey : "");
      setState("error");
    }
  }, [appId, channel, token, uid, hangUp, ping, setTracks, w.badKey]);

  const toggleMic = async () => {
    const track = tracks.current.mic;
    if (!track) return;
    const next = !micOn;
    await track.setEnabled(next);
    setMicOn(next);
  };

  const toggleCam = async () => {
    const track = tracks.current.cam;
    if (!track || sharing) return;
    const next = !camOn;
    await track.setEnabled(next);
    setCamOn(next);
  };

  /** While sharing the screen, the screen takes the place of the camera picture; stopping brings the camera back. */
  const toggleShare = async () => {
    const c = client.current;
    if (!c) return;
    setShareProblem(false);
    if (sharing) {
      await stopShare();
      return;
    }
    try {
      const AgoraRTC = (await import("agora-rtc-sdk-ng")).default;
      const track = await AgoraRTC.createScreenVideoTrack({ encoderConfig: "1080p_1" }, "disable");
      const video = Array.isArray(track) ? track[0] : track;
      setTracks({ screen: video });
      video.on("track-ended", () => void stopShare());
      if (tracks.current.cam) await c.unpublish(tracks.current.cam);
      await c.publish(video);
      setSharing(true);
    } catch {
      // the person closed the picker, or the browser has no screen sharing
      setShareProblem(true);
    }
  };

  const stopShare = async () => {
    const c = client.current;
    const video = tracks.current.screen;
    setTracks({ screen: null });
    setSharing(false);
    if (!c) return;
    try {
      if (video) {
        await c.unpublish(video);
        video.stop();
        video.close();
      }
      if (tracks.current.cam) await c.publish(tracks.current.cam);
    } catch {}
  };

  const leave = async () => {
    await hangUp();
    setState("left");
  };

  const nameOf = (id: number) => names[id] ?? w.guest;
  const over = state === "left" || state === "error";

  return (
    <div className="relative flex h-[78svh] min-h-[28rem] w-full flex-col overflow-hidden bg-ink text-white">
      {state === "ready" && (
        <div className="grid flex-1 place-items-center p-6 text-center">
          <div>
            <p className="text-xl font-medium">{w.ready}</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-white/70">{w.readyHint}</p>
            <button type="button" onClick={start} className="btn-primary mt-6 min-h-14 px-10 text-lg">
              {w.join}
            </button>
          </div>
        </div>
      )}
      {state === "joining" && <p role="status" className="grid flex-1 place-items-center p-6 text-light">{labels.loading}</p>}

      {state === "in" && (
        <>
          <div className="flex items-center justify-between gap-3 px-4 py-2 text-sm text-white/80">
            <span>
              {remotes.length + 1} {w.people}
            </span>
            {sharing && <span className="font-semibold text-white">{w.you} {w.sharing}</span>}
          </div>
          {deviceProblem && <p role="status" className="mx-4 mb-2 rounded bg-white/10 px-3 py-2 text-sm">{w.noDevice}</p>}
          {shareProblem && <p role="status" className="mx-4 mb-2 rounded bg-white/10 px-3 py-2 text-sm">{w.noShare}</p>}
          {audioBlocked && (
            <button
              type="button"
              onClick={() => {
                for (const u of client.current?.remoteUsers ?? []) u.audioTrack?.play();
                setAudioBlocked(false);
              }}
              className="mx-4 mb-2 rounded bg-brand px-3 py-2 text-left text-sm font-semibold"
            >
              {w.audioBlocked}
            </button>
          )}
          <div className="grid flex-1 content-start gap-2 overflow-y-auto p-2 sm:grid-cols-2 sm:p-4 lg:grid-cols-3">
            <Tile track={sharing ? shown.screen : shown.cam} name={selfName} tag={w.you} muted={!micOn} off={!sharing && !camOn} />
            {remotes.map((u) => (
              <Tile key={u.uid} track={u.videoTrack} name={nameOf(Number(u.uid))} tag={Number(u.uid) >= 1_000_000_000 ? w.host : undefined} muted={!u.hasAudio} off={!u.hasVideo} />
            ))}
          </div>
          {remotes.length === 0 && <p className="px-4 pb-2 text-center text-sm text-white/70">{w.alone}</p>}
          <div className="flex flex-wrap items-center justify-center gap-2 border-t border-white/10 bg-black/30 p-3">
            <button type="button" onClick={toggleMic} disabled={!shown.mic} aria-pressed={micOn} className="min-h-12 rounded border-2 border-white/40 px-4 font-medium hover:bg-white/10 disabled:opacity-40">
              {w.mic}: {micOn ? w.on : w.off}
            </button>
            <button type="button" onClick={toggleCam} disabled={!shown.cam || sharing} aria-pressed={camOn} className="min-h-12 rounded border-2 border-white/40 px-4 font-medium hover:bg-white/10 disabled:opacity-40">
              {w.cam}: {camOn ? w.on : w.off}
            </button>
            <button type="button" onClick={toggleShare} aria-pressed={sharing} className="min-h-12 rounded border-2 border-white/40 px-4 font-medium hover:bg-white/10">
              {sharing ? w.stopShare : w.share}
            </button>
            <button type="button" onClick={leave} className="min-h-12 rounded bg-red-600 px-6 font-semibold hover:bg-red-700">
              {w.leave}
            </button>
          </div>
        </>
      )}

      {over && (
        <div role="status" className="grid flex-1 place-items-center bg-white p-6 text-center text-ink">
          <div>
            <p className="text-lg font-medium">{state === "left" ? labels.left : labels.error}</p>
            {state === "error" && reason && <p className="mx-auto mt-2 max-w-md text-sm text-muted">{reason}</p>}
            <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
              <button type="button" onClick={start} className="btn-primary min-h-12">
                {labels.again}
              </button>
              <a href={backHref} className="inline-flex min-h-12 items-center justify-center rounded border-2 border-brand px-6 font-medium text-brand hover:bg-brand hover:text-white">
                {labels.back}
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
