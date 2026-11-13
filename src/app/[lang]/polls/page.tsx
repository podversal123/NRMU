import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { asc } from "drizzle-orm";
import Icon from "@/components/Icon";
import PageHero from "@/components/PageHero";
import { getDb, schema } from "@/db";
import { intlLocale, isLang, type Lang } from "@/lib/i18n";
import { getPublicPolls } from "@/lib/polls";
import { getUi, pick } from "@/lib/queries";

// Open and closed depend on the clock, so the list is built for each visit.
export const instant = false;

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return { title: isLang(lang) ? (await getUi(lang)).plTitle : undefined };
}

export default function PollsPage({ params }: { params: Promise<{ lang: string }> }) {
  return (
    <Suspense fallback={<div className="mx-auto max-w-wrap px-5 py-20" aria-busy="true" />}>
      <Polls params={params} />
    </Suspense>
  );
}

async function Polls({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  await connection();
  const ui = await getUi(lang);
  const [polls, divisions] = await Promise.all([getPublicPolls(), getDb().select().from(schema.divisions).orderBy(asc(schema.divisions.sort))]);
  const locale = intlLocale(lang);
  const when = (d: Date) => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(d);
  const divisionName = (id: number | null) => {
    const d = divisions.find((x) => x.id === id);
    return d ? pick(lang as Lang, d.nameEn, d.nameHi, d.i18n?.name) : null;
  };

  return (
    <>
      <PageHero lang={lang} title={ui.plTitle} crumbs={[{ href: `/${lang}`, label: ui.home }, { label: ui.plTitle }]} />
      <div className="mx-auto max-w-wrap px-5 py-10 sm:px-8 sm:py-12">
        <p className="max-w-3xl text-lg text-muted">{ui.plSub}</p>
        {polls.length ? (
          <ul className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
            {polls.map(({ poll: p, state }) => {
              const open = state === "open";
              const who = divisionName(p.divisionId);
              return (
                <li key={p.id}>
                  <Link href={`/${lang}/polls/${p.id}`} className="group flex h-full flex-col gap-4 rounded-lg border border-line bg-white p-6 shadow-sm transition hover:shadow-xl">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className={`rounded-full px-3 py-1 text-sm font-bold ${open ? "bg-signal/25 text-ink" : "bg-line text-muted"}`}>{open ? ui.plOpenNow : ui.plClosedNow}</span>
                      <span className="text-sm text-muted">{who ? `${ui.plForDivision} ${who}` : ui.plAllMembers}</span>
                    </div>
                    <h2 className="text-xl font-semibold leading-snug">{pick(lang as Lang, p.titleEn, p.titleHi, p.i18n?.title)}</h2>
                    {(p.descriptionEn || p.descriptionHi) && <p className="line-clamp-3 text-muted">{pick(lang as Lang, p.descriptionEn, p.descriptionHi, p.i18n?.description)}</p>}
                    <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-2">
                      <span className="text-sm text-muted">
                        {p.voters.toLocaleString(locale)} {ui.plVotersCount}
                        {open && p.endsAt ? ` · ${ui.plEnds}: ${when(p.endsAt)} IST` : ""}
                      </span>
                      <span className="inline-flex min-h-11 items-center gap-2 font-medium text-brand">
                        {open ? ui.plVoteNow : ui.plSeeResults} <Icon name="arrow" size={18} className="transition group-hover:translate-x-1" />
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-8 text-muted">{ui.plNone}</p>
        )}
      </div>
    </>
  );
}
