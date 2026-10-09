"use client";

import { useEffect, useRef, useState } from "react";

type Labels = { loading: string; left: string; again: string; back: string; error: string };

/** The video service's codes, in words the host can act on. Unknown codes are shown as they are. */
const REASONS: Record<string, string> = {
  "account-missing-payment-method": "The video account has no payment method yet. Add one in the Daily dashboard (Billing). Nothing is charged within the free minutes.",
};

/**
 * The call screen: Daily's ready-made meeting interface (camera, microphone, screen share, chat, people list,
 * waiting room) inside one box. The personal token comes from the server; this component only shows the call
 * and tells the site when this person came in and when they left.
 */
export default function VideoCall({
  url,
  token,
  backHref,
  presenceToken,
  showReason = false,
  labels,
}: {
  url: string;
  token: string;
  backHref: string;
  /** The invitee's own secret, used to record attendance. Not given for the host. */
  presenceToken?: string;
  /** Show the video service's own reason when the call cannot open (for the host only). */
  showReason?: boolean;
  labels: Labels;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "in" | "left" | "error">("loading");
  const [reason, setReason] = useState("");
  const [round, setRound] = useState(0); // bumped to join again

  useEffect(() => {
    let cancelled = false;
    let joined = false;
    let frame: { destroy: () => Promise<void> | void } | null = null;
    const ping = (event: "joined" | "left") => {
      if (!presenceToken) return;
      fetch("/api/meet/presence", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token: presenceToken, event }), keepalive: true }).catch(() => {});
    };

    (async () => {
      setState("loading");
      setReason("");
      const Daily = (await import("@daily-co/daily-js")).default;
      if (cancelled || !box.current) return;
      // Only one call can exist per page; a leftover one (hot reload, back button) is removed first.
      await Daily.getCallInstance()?.destroy();
      const call = Daily.createFrame(box.current, {
        iframeStyle: { width: "100%", height: "100%", border: "0" },
        showLeaveButton: true,
        showFullscreenButton: true,
      });
      frame = call;
      call
        .on("joined-meeting", () => {
          joined = true;
          setState("in");
          ping("joined");
        })
        .on("left-meeting", () => {
          // Leaving before ever getting in means the call could not be opened, not that the person left.
          if (joined) ping("left");
          setState(joined ? "left" : "error");
        })
        .on("error", (e) => {
          if (joined) return;
          const detail = e as { errorMsg?: string; error?: { msg?: string } } | undefined;
          setReason(detail?.errorMsg ?? detail?.error?.msg ?? "");
          setState("error");
        });
      await call.join({ url, token });
    })().catch(() => !cancelled && setState("error"));

    return () => {
      cancelled = true;
      Promise.resolve(frame?.destroy()).catch(() => {});
    };
  }, [url, token, presenceToken, round]);

  const over = state === "left" || state === "error";
  return (
    <div className="relative h-[78svh] min-h-[28rem] w-full overflow-hidden bg-ink">
      {/* the call itself stays in place; messages sit on top of it */}
      <div ref={box} className={`h-full w-full ${over ? "invisible" : ""}`} />
      {state === "loading" && <p className="absolute inset-0 z-10 grid place-items-center text-light">{labels.loading}</p>}
      {over && (
        <div role="status" className="absolute inset-0 z-10 grid place-items-center bg-white p-6 text-center">
          <div>
            <p className="text-lg font-medium">{state === "left" ? labels.left : labels.error}</p>
            {showReason && state === "error" && reason && <p className="mx-auto mt-2 max-w-md text-sm text-muted">{REASONS[reason] ?? reason}</p>}
            <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
              <button type="button" onClick={() => setRound((r) => r + 1)} className="btn-primary min-h-12">
                {labels.again}
              </button>
              <a href={backHref} className="inline-flex min-h-12 items-center justify-center rounded border-2 border-ink px-6 font-medium hover:bg-ink hover:text-light">
                {labels.back}
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
