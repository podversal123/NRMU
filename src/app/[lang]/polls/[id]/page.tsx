import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { eq } from "drizzle-orm";
import PageHero from "@/components/PageHero";
import { getDb, schema } from "@/db";
import { intlLocale, isLang } from "@/lib/i18n";
import { getMember } from "@/lib/member-auth";
import { canSeeTotals, getPoll, hasVoted, pollState } from "@/lib/polls";
import { getUi, pick } from "@/lib/queries";
import { votePoll } from "../actions";

// Depends on who is signed in and on the clock, so it is built for each visit.
export const instant = false;

export async function generateMetadata({ params }: { params: Promise<{ lang: string; id: string }> }) {
  const { lang, id } = await params;
  if (!isLang(lang) || !/^\d+$/.test(id)) return {};
  const found = await getPoll(Number(id));
  return { title: found ? pick(lang, found.poll.titleEn, found.poll.titleHi, found.poll.i18n?.title) : undefined };
}

type SP = Promise<{ e?: string; voted?: string }>;

export default function PollPage({ params, searchParams }: { params: Promise<{ lang: string; id: string }>; searchParams: SP }) {
  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl px-5 py-20" aria-busy="true" />}>
      <PollView params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function PollView({ params, searchParams }: { params: Promise<{ lang: string; id: string }>; searchParams: SP }) {
  const { lang, id } = await params;
  if (!isLang(lang) || !/^\d+$/.test(id) || Number(id) > 2 ** 31 - 1) notFound();
  const sp = await searchParams;
  await connection();
  const [ui, found, member] = await Promise.all([getUi(lang), getPoll(Number(id)), getMember()]);
  if (!found) notFound();
  const { poll, options } = found;
  const state = pollState(poll, new Date());
  if (state === "draft" || state === "scheduled") notFound(); // not yet public
  const open = state === "open";
  const voted = member ? await hasVoted(poll.id, member.id) : false;
  const mine = !poll.divisionId || (member && member.divisionId === poll.divisionId);
  const showTotals = canSeeTotals(poll, state, voted);
  const locale = intlLocale(lang);
  const title = pick(lang, poll.titleEn, poll.titleHi, poll.i18n?.title);
  const description = pick(lang, poll.descriptionEn, poll.descriptionHi, poll.i18n?.description);
  const when = (d: Date) => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(d);
  const [division] = poll.divisionId ? await getDb().select().from(schema.divisions).where(eq(schema.divisions.id, poll.divisionId)).limit(1) : [];
  const errors: Record<string, string> = { choose: ui.plErrChoose, many: ui.plErrMany, closed: ui.plErrClosed, limit: ui.plErrLimit };
  const error = sp.e ? errors[sp.e] : null;
  const multiple = poll.maxChoices > 1;
  // Totals are shown as a share of the members who voted, so several answers per member can add up to more than 100.
  const base = Math.max(1, poll.voters);
  const crumbs = [{ href: `/${lang}`, label: ui.home }, { href: `/${lang}/polls`, label: ui.plTitle }, { label: title }];

  return (
    <>
      <PageHero lang={lang} title={title} crumbs={crumbs} />
      <div className="mx-auto max-w-3xl space-y-6 px-5 py-10 sm:px-8 sm:py-12">
        <div className="flex flex-wrap items-center gap-3">
          <span className={`rounded-full px-3 py-1 text-sm font-bold ${open ? "bg-signal/25 text-ink" : "bg-line text-muted"}`}>{open ? ui.plOpenNow : ui.plClosedNow}</span>
          <span className="text-sm text-muted">{division ? `${ui.plForDivision} ${pick(lang, division.nameEn, division.nameHi, division.i18n?.name)}` : ui.plAllMembers}</span>
          <span className="text-sm text-muted">
            {poll.voters.toLocaleString(locale)} {ui.plVotersCount}
          </span>
          {open && poll.endsAt && <span className="text-sm text-muted">{ui.plEnds}: {when(poll.endsAt)} IST</span>}
        </div>
        {description && <p className="whitespace-pre-line text-lg">{description}</p>}

        {sp.voted && <p role="status" className="border-2 border-brand bg-white px-5 py-4 font-semibold text-brand-deep">{ui.plVotedMsg}</p>}
        {error && <p role="alert" className="border-2 border-brand bg-brand/10 px-5 py-4 font-semibold text-brand-deep">{error}</p>}

        {open && !member && (
          <section className="border border-line bg-white p-6 sm:p-8">
            <p className="text-lg font-medium">{ui.plSignIn}</p>
            <Link href={`/${lang}/member/login`} className="btn-primary mt-4 inline-flex min-h-12 items-center px-8">{ui.plSignInBtn}</Link>
          </section>
        )}
        {open && member && !mine && <p className="border border-line bg-white p-6 text-muted">{ui.plOtherDivision}</p>}
        {open && member && mine && voted && <p className="border border-line bg-white p-6 font-medium">{ui.plAlready}</p>}

        {open && member && mine && !voted && (
          <form action={votePoll} className="space-y-4 border border-line bg-white p-6 sm:p-8">
            <input type="hidden" name="lang" value={lang} />
            <input type="hidden" name="poll" value={poll.id} />
            <fieldset>
              <legend className="text-lg font-semibold">{multiple ? ui.plPickUpTo.replace("{n}", String(poll.maxChoices)) : ui.plPickOne}</legend>
              <div className="mt-4 space-y-3">
                {options.map((o) => (
                  <label key={o.id} className="flex min-h-14 cursor-pointer items-center gap-4 rounded-lg border-2 border-line px-4 py-3 text-lg has-[:checked]:border-brand has-[:checked]:bg-brand/5">
                    <input type={multiple ? "checkbox" : "radio"} name="option" value={o.id} required={!multiple} className="h-6 w-6 shrink-0 accent-[var(--color-brand)]" />
                    <span>{pick(lang, o.labelEn, o.labelHi, o.i18n?.label)}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <p className="text-sm text-muted">{ui.plSecret}</p>
            <button type="submit" className="btn-primary flex min-h-14 w-full items-center justify-center text-lg sm:w-auto sm:px-12">{ui.plVoteBtn}</button>
          </form>
        )}

        {!open && <p className="font-medium text-muted">{ui.plEnded}</p>}

        {showTotals ? (
          <section aria-labelledby="results-h" className="border border-line bg-white p-6 sm:p-8">
            <h2 id="results-h" className="text-xl font-semibold">{ui.plResults}</h2>
            <ul className="mt-5 space-y-5">
              {options.map((o) => {
                const pct = Math.round((o.votes / base) * 100);
                return (
                  <li key={o.id}>
                    <div className="flex items-baseline justify-between gap-4">
                      <span className="font-medium">{pick(lang, o.labelEn, o.labelHi, o.i18n?.label)}</span>
                      <span className="shrink-0 tabular-nums text-muted">{o.votes.toLocaleString(locale)} · {pct}%</span>
                    </div>
                    <div className="mt-2 h-3 overflow-hidden rounded-full bg-line" role="presentation">
                      <div className="h-full rounded-full bg-brand" style={{ width: `${Math.min(100, pct)}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="mt-5 text-sm text-muted">{ui.plSecret}</p>
          </section>
        ) : (
          <p className="text-sm text-muted">
            {poll.showResults === "admin_only" ? ui.plResultsHidden : poll.showResults === "after_vote" && open && !voted ? ui.plResultsVote : ui.plResultsLater}
          </p>
        )}

        <Link href={`/${lang}/polls`} className="inline-flex min-h-11 items-center font-medium text-brand underline underline-offset-4">{ui.plAllPolls}</Link>
      </div>
    </>
  );
}
