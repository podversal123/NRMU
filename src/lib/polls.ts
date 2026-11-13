import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";

export type Poll = typeof schema.polls.$inferSelect;
export type PollOption = typeof schema.pollOptions.$inferSelect;
export type PollState = "draft" | "scheduled" | "open" | "closed";

export const SHOW_RESULTS = [
  { value: "after_vote", label: "Members see the totals after they have voted" },
  { value: "after_close", label: "Members see the totals only when voting is over" },
  { value: "admin_only", label: "Only the admin sees the totals" },
] as const;

/** What a poll is right now. "open" and "closed" also follow the clock (start and end times), not only the status. */
export function pollState(p: Pick<Poll, "status" | "startsAt" | "endsAt">, now: Date): PollState {
  if (p.status === "draft") return "draft";
  if (p.status === "closed") return "closed";
  if (p.startsAt && now < p.startsAt) return "scheduled";
  if (p.endsAt && now >= p.endsAt) return "closed";
  return "open";
}

/** May this member see the totals? The ballot is secret either way; this is only about the running totals. */
export function canSeeTotals(p: Pick<Poll, "showResults">, state: PollState, voted: boolean) {
  if (p.showResults === "admin_only") return false;
  if (state === "closed") return true;
  return p.showResults === "after_vote" && voted;
}

/** Polls the members can see: open ones first (newest first), then closed ones. Drafts are never shown. */
export async function getPublicPolls() {
  const rows = await getDb().select().from(schema.polls).orderBy(asc(schema.polls.id));
  const now = new Date();
  return rows
    .map((p) => ({ poll: p, state: pollState(p, now) }))
    .filter((x) => x.state === "open" || x.state === "closed")
    .sort((a, b) => (a.state === b.state ? b.poll.id - a.poll.id : a.state === "open" ? -1 : 1));
}

export async function getPoll(id: number) {
  const db = getDb();
  const [poll] = await db.select().from(schema.polls).where(eq(schema.polls.id, id)).limit(1);
  if (!poll) return null;
  const options = await db.select().from(schema.pollOptions).where(eq(schema.pollOptions.pollId, id)).orderBy(asc(schema.pollOptions.sort), asc(schema.pollOptions.id));
  return { poll, options };
}

export async function hasVoted(pollId: number, memberId: number) {
  const [row] = await getDb()
    .select({ m: schema.pollVoters.memberId })
    .from(schema.pollVoters)
    .where(and(eq(schema.pollVoters.pollId, pollId), eq(schema.pollVoters.memberId, memberId)))
    .limit(1);
  return Boolean(row);
}
