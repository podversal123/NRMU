import Link from "next/link";
import { sql } from "drizzle-orm";
import Icon, { ICON_NAMES } from "@/components/Icon";
import { getDb } from "@/db";
import { requireAdmin } from "@/lib/auth";
import type { I18n } from "@/lib/i18n";
import OtherLanguages from "../../OtherLanguages";
import { SubmitButton } from "../../SubmitButton";
import { Card, Field, Notice, PageTitle, inputCls } from "../../ui";
import { resolveReports, reviewPost, saveTopic, setCommentStatus } from "./actions";

// Always depends on the signed-in admin, so it is rendered per request.
export const instant = false;
export const metadata = { title: "Feed & moderation" };

const rowsOf = <T,>(r: unknown) => ((r as { rows?: T[] }).rows ?? r) as T[];
const fmt = (iso: string | Date) => new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(iso));

const TABS = [
  { key: "queue", label: "Waiting for approval" },
  { key: "reports", label: "Reports" },
  { key: "comments", label: "Comments" },
  { key: "published", label: "Published posts" },
  { key: "removed", label: "Taken down" },
  { key: "topics", label: "Topics" },
] as const;
type Tab = (typeof TABS)[number]["key"];

type PostRow = {
  id: number;
  body: string;
  anonymous: boolean;
  status: string;
  review_note: string | null;
  created_at: string;
  published_at: string | null;
  member_name: string;
  membership_no: string | null;
  member_id: number;
  division: string | null;
  topic: string | null;
};
type MediaRow = { post_id: number; url: string; kind: string };

const DONE: Record<string, string> = {
  approve: "Approved. The post is now in the feed.",
  reject: "Turned down. The member can see your note.",
  remove: "Taken out of the feed. The member can see your note.",
  restore: "Put back in the feed.",
  comment: "Comment updated.",
  report: "Report closed.",
  topic: "Topic saved.",
};

/**
 * Moderation of the feed: members' posts wait here until approved; reported posts and comments, recent comments,
 * published posts that may need taking down, and the topics members can post under.
 */
export default async function FeedAdmin({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin(["super_admin", "editor"]);
  const sp = await searchParams;
  const tab: Tab = TABS.some((t) => t.key === sp.tab) ? (sp.tab as Tab) : "queue";
  const db = getDb();

  const [counts] = rowsOf<{ queue: number; reports: number }>(
    await db.execute(sql`select (select count(*)::int from member_posts where status = 'pending') as queue,
                                (select count(*)::int from (select distinct target, target_id from feed_reports where status = 'open') r) as reports`),
  );
  const self = `/admin/feed${tab === "queue" ? "" : `?tab=${tab}`}`;

  return (
    <>
      <PageTitle title="Feed & moderation" sub="Members' posts appear in the public feed only after approval. Admins always see the real name, also when a member hid it." />
      {sp.done && DONE[sp.done] && <Notice>{DONE[sp.done]}</Notice>}
      {sp.stale && <Notice kind="err">That post had already been changed by someone else. The list below is up to date.</Notice>}
      {sp.error === "name" && <Notice kind="err">Please enter the topic name in English.</Notice>}

      <nav aria-label="Feed sections" className="mb-6 flex flex-wrap gap-2">
        {TABS.map((t) => {
          const n = t.key === "queue" ? counts.queue : t.key === "reports" ? counts.reports : 0;
          return (
            <Link
              key={t.key}
              href={t.key === "queue" ? "/admin/feed" : `/admin/feed?tab=${t.key}`}
              aria-current={tab === t.key ? "page" : undefined}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${tab === t.key ? "bg-ink text-white" : "border-2 border-line bg-white hover:border-ink"}`}
            >
              {t.label}
              {n > 0 && <span className="inline-grid h-5 min-w-5 place-items-center rounded-full bg-signal px-1.5 text-xs font-bold text-ink">{n}</span>}
            </Link>
          );
        })}
      </nav>

      {tab === "queue" && <PostList status="pending" self={self} />}
      {tab === "published" && <PostList status="approved" self={self} />}
      {tab === "removed" && <PostList status="removed" self={self} />}
      {tab === "reports" && <Reports self={self} />}
      {tab === "comments" && <Comments self={self} />}
      {tab === "topics" && <Topics />}
    </>
  );
}

async function loadPosts(status: string, limit: number) {
  const db = getDb();
  const posts = rowsOf<PostRow>(
    await db.execute(sql`
      select mp.id, mp.body, mp.anonymous, mp.status, mp.review_note, mp.created_at::text, mp.published_at::text,
             m.id as member_id, m.name as member_name, m.membership_no, d.name_en as division, t.name_en as topic
      from member_posts mp
      join members m on m.id = mp.member_id
      left join divisions d on d.id = m.division_id
      left join feed_topics t on t.id = mp.topic_id
      where mp.status = ${status}
      order by ${status === "pending" ? sql`mp.created_at asc` : sql`mp.published_at desc nulls last, mp.id desc`}
      limit ${limit}`),
  );
  const media = posts.length
    ? rowsOf<MediaRow>(await db.execute(sql`select post_id, url, kind from member_post_media where post_id in (${sql.join(posts.map((p) => sql`${p.id}`), sql`, `)}) order by sort`))
    : [];
  return { posts, media };
}

function PostBody({ p, media }: { p: PostRow; media: MediaRow[] }) {
  const own = media.filter((m) => Number(m.post_id) === Number(p.id));
  return (
    <>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <Link href={`/admin/members/${p.member_id}`} className="font-semibold text-brand hover:underline">
          {p.member_name}
        </Link>
        {p.membership_no && <span className="font-mono text-muted">{p.membership_no}</span>}
        {p.division && <span className="text-muted">{p.division}</span>}
        {p.topic && <span className="rounded-full bg-paper px-2.5 py-0.5 font-semibold">{p.topic}</span>}
        {p.anonymous && <span className="rounded-full bg-signal/25 px-2.5 py-0.5 font-semibold">Name hidden in the feed</span>}
        <span className="ml-auto text-muted">{fmt(p.created_at)}</span>
      </div>
      <p className="mt-3 whitespace-pre-line break-words">{p.body}</p>
      {own.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {own.map((m) => (
            <li key={m.url}>
              <a href={m.url} target="_blank" rel="noopener noreferrer" className="block h-24 w-24 overflow-hidden rounded-lg border border-line bg-ink">
                {m.kind === "video" ? (
                  <video src={m.url} muted preload="metadata" className="h-full w-full object-cover" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.url} alt="" className="h-full w-full object-cover" />
                )}
              </a>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

async function PostList({ status, self }: { status: "pending" | "approved" | "removed"; self: string }) {
  const { posts, media } = await loadPosts(status, 50);
  if (!posts.length) return <Card><p className="text-muted">{status === "pending" ? "Nothing is waiting. New posts from members will appear here." : status === "removed" ? "No posts have been taken down." : "No member posts are published yet."}</p></Card>;
  return (
    <div className="space-y-4">
      {posts.map((p) => (
        <Card key={p.id}>
          <PostBody p={p} media={media} />
          {status === "approved" && (
            <p className="mt-3 text-sm">
              <Link href={`/en/feed/post/${p.id}`} target="_blank" className="font-semibold text-brand hover:underline">
                Open in the feed ↗
              </Link>
            </p>
          )}
          {status === "removed" && p.review_note && (
            <p className="mt-3 rounded-lg bg-paper px-3 py-2 text-sm">
              <span className="font-semibold">Note sent to the member:</span> {p.review_note}
            </p>
          )}
          <div className="mt-4 flex flex-wrap items-start gap-3 border-t border-line pt-4">
            {(status === "pending" || status === "removed") && (
              <form action={reviewPost}>
                <input type="hidden" name="id" value={p.id} />
                <input type="hidden" name="decision" value={status === "pending" ? "approve" : "restore"} />
                <input type="hidden" name="back" value={self} />
                <SubmitButton className="btn-primary px-5 py-2.5 text-sm">{status === "pending" ? "Approve" : "Put back in the feed"}</SubmitButton>
              </form>
            )}
            {status !== "removed" && (
              <form action={reviewPost} className="flex min-w-[16rem] flex-1 flex-wrap items-start gap-2">
                <input type="hidden" name="id" value={p.id} />
                <input type="hidden" name="decision" value={status === "pending" ? "reject" : "remove"} />
                <input type="hidden" name="back" value={self} />
                <label className="min-w-0 flex-1">
                  <span className="sr-only">Note to the member</span>
                  <input name="note" placeholder="Note to the member (why)" maxLength={500} className={`${inputCls} mt-0`} />
                </label>
                <SubmitButton className="rounded-full border-2 border-brand px-4 py-2.5 text-sm font-semibold text-brand hover:bg-brand hover:text-white">
                  {status === "pending" ? "Turn down" : "Take out of the feed"}
                </SubmitButton>
              </form>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}

type ReportRow = { target: string; target_id: number; reports: number; reasons: string[]; last_at: string; preview: string | null; extra: string | null };

async function Reports({ self }: { self: string }) {
  const rows = rowsOf<ReportRow>(
    await getDb().execute(sql`
      select r.target, r.target_id, count(*)::int as reports, array_remove(array_agg(nullif(r.reason, '') order by r.created_at desc), null) as reasons,
             max(r.created_at)::text as last_at,
             case r.target
               when 'comment' then (select c.body from feed_comments c where c.id = r.target_id)
               when 'member' then (select mp.body from member_posts mp where mp.id = r.target_id)
               else (select p.title_en from posts p where p.id = r.target_id)
             end as preview,
             case r.target
               when 'comment' then (select m.name || ' · ' || c.status from feed_comments c join members m on m.id = c.member_id where c.id = r.target_id)
               when 'member' then (select m.name || ' · ' || mp.status from member_posts mp join members m on m.id = mp.member_id where mp.id = r.target_id)
               else null
             end as extra
      from feed_reports r
      where r.status = 'open'
      group by r.target, r.target_id
      order by count(*) desc, max(r.created_at) desc
      limit 100`),
  );
  if (!rows.length) return <Card><p className="text-muted">No open reports.</p></Card>;
  const what = { comment: "Comment", member: "Member's post", order: "Order" } as Record<string, string>;
  const link = (r: ReportRow) => (r.target === "order" ? `/admin/posts/${r.target_id}` : r.target === "member" ? `/en/feed/post/${r.target_id}` : null);
  return (
    <div className="space-y-4">
      {rows.map((r) => (
        <Card key={`${r.target}-${r.target_id}`}>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="rounded-full bg-brand/10 px-2.5 py-0.5 font-bold text-brand">{what[r.target] ?? r.target}</span>
            <span className="font-semibold">{r.reports} report{r.reports === 1 ? "" : "s"}</span>
            {r.extra && <span className="text-muted">{r.extra}</span>}
            <span className="ml-auto text-muted">{fmt(r.last_at)}</span>
          </div>
          <p className="mt-3 line-clamp-4 whitespace-pre-line break-words">{r.preview ?? "(no longer exists)"}</p>
          {r.reasons.length > 0 && (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted">
              {r.reasons.slice(0, 5).map((x, i) => (
                <li key={i}>{x}</li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-4">
            {link(r) && (
              <Link href={link(r)!} target="_blank" className="text-sm font-semibold text-brand hover:underline">
                Open ↗
              </Link>
            )}
            {r.target !== "order" && (
              <form action={resolveReports} className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="target" value={r.target} />
                <input type="hidden" name="targetId" value={r.target_id} />
                <input type="hidden" name="how" value="act" />
                <input type="hidden" name="back" value={self} />
                {r.target === "member" && <input name="note" placeholder="Note to the member" maxLength={500} className={`${inputCls} mt-0 w-64`} />}
                <SubmitButton className="btn-primary px-4 py-2.5 text-sm">{r.target === "comment" ? "Hide the comment" : "Take the post down"}</SubmitButton>
              </form>
            )}
            <form action={resolveReports}>
              <input type="hidden" name="target" value={r.target} />
              <input type="hidden" name="targetId" value={r.target_id} />
              <input type="hidden" name="how" value="dismiss" />
              <input type="hidden" name="back" value={self} />
              <SubmitButton className="rounded-full border-2 border-line px-4 py-2.5 text-sm font-semibold hover:border-ink">Nothing wrong, close</SubmitButton>
            </form>
          </div>
        </Card>
      ))}
    </div>
  );
}

async function Comments({ self }: { self: string }) {
  const rows = rowsOf<{ id: number; target: string; target_id: number; kind: string; body: string; status: string; created_at: string; name: string; member_id: number }>(
    await getDb().execute(sql`
      select c.id, c.target, c.target_id, c.kind, c.body, c.status, c.created_at::text, m.name, m.id as member_id
      from feed_comments c join members m on m.id = c.member_id
      order by c.created_at desc limit 100`),
  );
  if (!rows.length) return <Card><p className="text-muted">No comments yet.</p></Card>;
  return (
    <Card className="p-0 sm:p-0">
      <ul className="divide-y divide-line">
        {rows.map((c) => (
          <li key={c.id} className={`px-5 py-4 ${c.status === "hidden" ? "bg-paper/60" : ""}`}>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <Link href={`/admin/members/${c.member_id}`} className="font-semibold text-brand hover:underline">
                {c.name}
              </Link>
              {c.kind === "suggestion" && <span className="rounded-full bg-signal/25 px-2.5 py-0.5 font-semibold">Suggestion</span>}
              {c.status === "hidden" && <span className="rounded-full bg-line px-2.5 py-0.5 font-semibold">Hidden</span>}
              <Link href={c.target === "order" ? `/en/orders/${c.target_id}` : `/en/feed/post/${c.target_id}`} target="_blank" className="text-muted hover:text-brand">
                on {c.target === "order" ? "order" : "post"} #{c.target_id} ↗
              </Link>
              <span className="ml-auto text-muted">{fmt(c.created_at)}</span>
            </div>
            <p className="mt-2 whitespace-pre-line break-words">{c.body}</p>
            <form action={setCommentStatus} className="mt-2">
              <input type="hidden" name="id" value={c.id} />
              <input type="hidden" name="to" value={c.status === "hidden" ? "visible" : "hidden"} />
              <input type="hidden" name="back" value={self} />
              <SubmitButton className="rounded-full border-2 border-line px-4 py-2 text-sm font-semibold hover:border-ink">{c.status === "hidden" ? "Show again" : "Hide"}</SubmitButton>
            </form>
          </li>
        ))}
      </ul>
    </Card>
  );
}

async function Topics() {
  const rows = rowsOf<{ id: number; name_en: string; name_hi: string | null; sort: number; active: boolean; i18n: I18n; icon: string; posts: number }>(
    await getDb().execute(sql`select t.*, (select count(*)::int from member_posts mp where mp.topic_id = t.id) as posts from feed_topics t order by t.sort, t.id`),
  );
  const form = (t?: (typeof rows)[number]) => (
    <form action={saveTopic} className="grid gap-4 sm:grid-cols-[1fr_1fr_6rem_12rem_auto] sm:items-end">
      <input type="hidden" name="id" value={t?.id ?? ""} />
      <Field label="Name (English)">
        <input name="nameEn" required defaultValue={t?.name_en} maxLength={120} className={inputCls} />
      </Field>
      <Field label="Name (Hindi)">
        <input name="nameHi" defaultValue={t?.name_hi ?? ""} maxLength={120} className={inputCls} />
      </Field>
      <Field label="Order">
        <input name="sort" type="number" min={0} max={999} defaultValue={t?.sort ?? rows.length} className={inputCls} />
      </Field>
      <Field label="Icon on the chip">
        <span className="mt-1.5 flex items-center gap-2">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-paper text-brand">
            <Icon name={t?.icon ?? "chat"} size={20} />
          </span>
          <select name="icon" defaultValue={t?.icon ?? "chat"} className={`${inputCls} mt-0`}>
            {ICON_NAMES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </span>
      </Field>
      <div className="flex items-center gap-4 pb-1">
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" name="active" defaultChecked={t ? t.active : true} className="size-5" /> In use
        </label>
        <SubmitButton className="btn-primary px-5 py-2.5 text-sm">{t ? "Save" : "Add"}</SubmitButton>
      </div>
      <div className="sm:col-span-5">
        <OtherLanguages fields={[{ name: "name", label: "Name" }]} value={t?.i18n} />
      </div>
    </form>
  );
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">Members choose one of these when they post. A topic taken out of use stays on the posts that already have it.</p>
      {rows.map((t) => (
        <Card key={t.id}>
          <p className="mb-3 text-sm text-muted">
            {t.posts} post{t.posts === 1 ? "" : "s"} {t.active ? "" : "· not in use"}
          </p>
          {form(t)}
        </Card>
      ))}
      <Card>
        <h2 className="mb-4 text-lg font-semibold">Add a topic</h2>
        {form()}
      </Card>
    </div>
  );
}
