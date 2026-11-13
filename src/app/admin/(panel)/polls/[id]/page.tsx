import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { toIst } from "@/lib/meetings";
import { pollState, SHOW_RESULTS } from "@/lib/polls";
import OtherLanguages from "../../../OtherLanguages";
import { DeleteButton, SubmitButton } from "../../../SubmitButton";
import { Card, Field, Notice, PageTitle, inputCls } from "../../../ui";
import { deletePoll, savePoll, setPollStatus } from "../actions";

// Always depends on the signed-in admin, so it is rendered per request.
export const instant = false;
export const metadata = { title: "Poll" };

const ERRORS: Record<string, string> = {
  title: "The question is required (at least 5 characters).",
  options: "A poll needs at least two answers.",
  duplicate: "Two answers are the same. Each answer must be different.",
  time: "The closing time must be after the start time, and both must be valid.",
  kept: "This poll already has votes, so it is kept as a record. Close it instead of deleting it.",
};
const ROWS = 10;

export default async function EditPoll({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin(["super_admin", "editor"]);
  const { id } = await params;
  const sp = await searchParams;
  const isNew = id === "new";
  if (!isNew && !/^\d+$/.test(id)) notFound();
  const db = getDb();
  const [p] = isNew ? [] : await db.select().from(schema.polls).where(eq(schema.polls.id, Number(id))).limit(1);
  if (!isNew && !p) notFound();
  const [options, divisions] = await Promise.all([
    isNew ? [] : db.select().from(schema.pollOptions).where(eq(schema.pollOptions.pollId, Number(id))).orderBy(asc(schema.pollOptions.sort), asc(schema.pollOptions.id)),
    db.select().from(schema.divisions).orderBy(asc(schema.divisions.sort)),
  ]);
  const state = p ? pollState(p, new Date()) : null;
  const locked = Boolean(p && p.voters > 0); // answers cannot be added or removed once someone has voted
  // with votes the answers are fixed, so only the existing ones are shown; otherwise ten rows to fill
  const rows = locked ? options : Array.from({ length: ROWS }, (_, i) => options[i] ?? null);
  const base = Math.max(1, p?.voters ?? 1);

  return (
    <>
      <PageTitle
        title={isNew ? "New poll" : p.titleEn}
        sub={p ? `${state} · ${p.voters} ${p.voters === 1 ? "member has" : "members have"} voted` : "Ask the members a question. You can add the Hindi wording too."}
        action={<Link href="/admin/polls" className="inline-block py-2 text-sm font-semibold text-brand">← All polls</Link>}
      />
      {sp.saved && <Notice>Saved.</Notice>}
      {sp.error && <Notice kind="err">{ERRORS[sp.error] ?? "Please check the form."}</Notice>}

      <form action={savePoll} className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <input type="hidden" name="id" value={isNew ? "" : id} />
        <Card className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="Question (English) *" className="sm:col-span-2"><input name="titleEn" required minLength={5} maxLength={300} defaultValue={p?.titleEn} className={inputCls} /></Field>
          <Field label="Question (Hindi)" className="sm:col-span-2"><input name="titleHi" maxLength={300} defaultValue={p?.titleHi ?? ""} className={inputCls} /></Field>
          <Field label="Explanation (English)" hint="Optional. Why you are asking." className="sm:col-span-2"><textarea name="descriptionEn" rows={3} defaultValue={p?.descriptionEn ?? ""} className={inputCls} /></Field>
          <Field label="Explanation (Hindi)" className="sm:col-span-2"><textarea name="descriptionHi" rows={3} defaultValue={p?.descriptionHi ?? ""} className={inputCls} /></Field>

          <div className="sm:col-span-2">
            <p className="text-sm font-semibold">Answers * (at least two)</p>
            <p className="mt-1 text-xs text-muted">{locked ? "Votes have been cast, so answers cannot be added or removed. You can still correct their wording." : "Fill as many rows as you need, up to 10. Empty rows are ignored."}</p>
            <div className="mt-3 space-y-2">
              {rows.map((o, i) => (
                <div key={i} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <input type="hidden" name="optId" value={o?.id ?? ""} />
                  <input name="optEn" maxLength={200} placeholder={`Answer ${i + 1} (English)`} defaultValue={o?.labelEn ?? ""} className={inputCls + " mt-0"} aria-label={`Answer ${i + 1} in English`} />
                  <input name="optHi" maxLength={200} placeholder={`Answer ${i + 1} (Hindi)`} defaultValue={o?.labelHi ?? ""} className={inputCls + " mt-0"} aria-label={`Answer ${i + 1} in Hindi`} />
                </div>
              ))}
            </div>
          </div>

          <OtherLanguages className="sm:col-span-2" fields={[{ name: "title", label: "Question" }, { name: "description", label: "Explanation", rows: 3 }]} value={p?.i18n} />
        </Card>

        <Card className="space-y-5 self-start">
          <Field label="Status">
            <select name="status" defaultValue={p?.status ?? "draft"} className={inputCls}>
              <option value="draft">Draft (members cannot see it)</option>
              <option value="open">Open (members can vote)</option>
              <option value="closed">Closed (voting is over)</option>
            </select>
          </Field>
          <Field label="Who can vote">
            <select name="divisionId" defaultValue={p?.divisionId ?? ""} className={inputCls}>
              <option value="">All members</option>
              {divisions.map((d) => <option key={d.id} value={d.id}>Only {d.nameEn} division</option>)}
            </select>
          </Field>
          <Field label="How many answers one member may choose" hint="1 means choose one.">
            <select name="maxChoices" defaultValue={p?.maxChoices ?? 1} className={inputCls}>
              {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n === 1 ? "One answer" : `Up to ${n} answers`}</option>)}
            </select>
          </Field>
          <Field label="When can members see the totals">
            <select name="showResults" defaultValue={p?.showResults ?? "after_vote"} className={inputCls}>
              {SHOW_RESULTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </Field>
          <Field label="Opens at (India time)" hint="Optional."><input type="datetime-local" name="startsAt" defaultValue={toIst(p?.startsAt)} className={inputCls} /></Field>
          <Field label="Closes at (India time)" hint="Optional. The poll closes by itself then."><input type="datetime-local" name="endsAt" defaultValue={toIst(p?.endsAt)} className={inputCls} /></Field>
          <SubmitButton className="btn-primary w-full px-6 py-3">{isNew ? "Create poll" : "Save"}</SubmitButton>
          <p className="text-sm text-muted">The vote is secret. Only the totals are kept, never who chose what.</p>
        </Card>
      </form>

      {p && (
        <>
          <Card className="mt-8">
            <h2 className="font-display text-2xl font-bold">Results</h2>
            <p className="mt-1 text-sm text-muted">{p.voters} {p.voters === 1 ? "member has" : "members have"} voted. Percentages are a share of the members who voted.</p>
            <ul className="mt-5 space-y-4">
              {options.map((o) => {
                const pct = Math.round((o.votes / base) * 100);
                return (
                  <li key={o.id}>
                    <div className="flex items-baseline justify-between gap-4"><span className="font-medium">{o.labelEn}</span><span className="tabular-nums text-muted">{o.votes} · {pct}%</span></div>
                    <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-brand" style={{ width: `${Math.min(100, pct)}%` }} /></div>
                  </li>
                );
              })}
            </ul>
            <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line pt-5">
              {state !== "closed" && (
                <form action={setPollStatus}>
                  <input type="hidden" name="id" value={p.id} /><input type="hidden" name="status" value="closed" />
                  <SubmitButton className="rounded-full border-2 border-ink px-5 py-2.5 text-sm font-semibold hover:bg-ink hover:text-white">Close voting now</SubmitButton>
                </form>
              )}
              {state === "closed" && (
                <form action={setPollStatus}>
                  <input type="hidden" name="id" value={p.id} /><input type="hidden" name="status" value="open" />
                  <SubmitButton className="rounded-full border-2 border-ink px-5 py-2.5 text-sm font-semibold hover:bg-ink hover:text-white">Open voting again</SubmitButton>
                </form>
              )}
              {p.status !== "draft" && <Link href={`/en/polls/${p.id}`} target="_blank" className="text-sm font-semibold text-brand underline-offset-2 hover:underline">View on the website</Link>}
            </div>
          </Card>
          {p.voters === 0 ? (
            <form action={deletePoll} className="mt-6">
              <input type="hidden" name="id" value={p.id} />
              <DeleteButton label="Delete this poll" confirmText="Delete this poll permanently?" />
            </form>
          ) : (
            <p className="mt-6 text-sm text-muted">This poll has votes, so it is kept as a record. Use "Close voting now" instead of deleting.</p>
          )}
        </>
      )}
    </>
  );
}
