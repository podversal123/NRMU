"use client";

import { useState } from "react";

type Person = { name: string; token: string; mobile: string | null };

const base = "inline-flex min-h-11 items-center rounded-full border-2 px-4 text-sm font-semibold";

/** The invitee's own page: /hi/meet/<token> when the meeting has a Hindi title, otherwise /en/meet/<token>. */
const linkOf = (lang: string, token: string) => `${window.location.origin}/${lang}/meet/${token}`;

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
  return d.length === 10 ? `91${d}` : d.length === 11 && d.startsWith("0") ? `91${d.slice(1)}` : d;
};

export function SendButtons({ person, lang, title, when }: { person: Person; lang: string; title: string; when: string }) {
  const [done, setDone] = useState(false);
  const message = () => `${title}\n${when}\n${linkOf(lang, person.token)}`;
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
      {person.mobile && (
        <a
          href={`https://wa.me/${whatsappNumber(person.mobile)}?text=${encodeURIComponent(message())}`}
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
