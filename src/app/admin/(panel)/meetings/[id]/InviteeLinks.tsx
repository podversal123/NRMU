"use client";

import { useState, useSyncExternalStore } from "react";

type Person = { name: string; token: string; mobile: string | null };

const base = "inline-flex min-h-11 items-center rounded-full border-2 px-4 text-sm font-semibold";

/** The invitee's own page: /hi/meet/<token> when the meeting has a Hindi title, otherwise /en/meet/<token>. */
const linkOf = (lang: string, token: string) => `${window.location.origin}/${lang}/meet/${token}`;

/** The site's address as the browser knows it. Empty while the page is built on the server, where there is no `window`. */
const noSubscribe = () => () => {};
const useOrigin = () => useSyncExternalStore(noSubscribe, () => window.location.origin, () => "");

/** What the invitee reads in WhatsApp: the meeting, the time, what to do, and their own link. */
const invitation = (lang: string, title: string, when: string, link: string) =>
  lang === "hi"
    ? `${title}\n${when}\n\nअपना निजी लिंक खोलें और बताएं कि आप आएंगे या नहीं। बैठक शुरू होने से 15 मिनट पहले उसी पेज पर "वीडियो कॉल में जुड़ें" बटन दिखेगा।\n${link}`
    : `${title}\n${when}\n\nOpen your personal link and tell us if you will attend. The "Join the video call" button appears on that page 15 minutes before the meeting starts.\n${link}`;

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Older browsers and plain-http pages: fall back to a hidden text box.
    const box = document.createElement("textarea");
    box.value = text;
    box.style.position = "fixed";
    box.style.opacity = "0";
    document.body.appendChild(box);
    box.select();
    document.execCommand("copy");
    box.remove();
  }
}

/** WhatsApp wants the number with its country code and nothing else. Indian 10-digit numbers get 91. */
const whatsappNumber = (mobile: string) => {
  const d = mobile.replace(/\D/g, "");
  if (mobile.trim().startsWith("+")) return d; // already has its country code (anywhere in the world)
  return d.length === 10 ? `91${d}` : d.length === 11 && d.startsWith("0") ? `91${d.slice(1)}` : d;
};

export function SendButtons({ person, lang, title, when }: { person: Person; lang: string; title: string; when: string }) {
  const [done, setDone] = useState(false);
  const origin = useOrigin();
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={async () => {
          await copy(linkOf(lang, person.token));
          setDone(true);
          setTimeout(() => setDone(false), 1800);
        }}
        className={`${base} border-line hover:border-ink`}
      >
        {done ? "Copied" : "Copy link"}
      </button>
      {person.mobile && origin && (
        <a
          href={`https://wa.me/${whatsappNumber(person.mobile)}?text=${encodeURIComponent(invitation(lang, title, when, `${origin}/${lang}/meet/${person.token}`))}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Send to ${person.name} on WhatsApp`}
          className={`${base} border-ink hover:bg-ink hover:text-white`}
        >
          WhatsApp
        </a>
      )}
    </div>
  );
}

/** One line per person ("Name: link"), ready to paste into a WhatsApp group or a sheet. */
export function CopyAll({ people, lang }: { people: Person[]; lang: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await copy(people.map((p) => `${p.name}: ${linkOf(lang, p.token)}`).join("\n"));
        setDone(true);
        setTimeout(() => setDone(false), 1800);
      }}
      className={`${base} border-line hover:border-ink`}
    >
      {done ? "Copied" : "Copy all links"}
    </button>
  );
}
