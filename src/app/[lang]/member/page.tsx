import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { eq } from "drizzle-orm";
import PageHero from "@/components/PageHero";
import { getDb, schema } from "@/db";
import Link from "next/link";
import { getMyPosts } from "@/lib/feed";
import { intlLocale, isLang, type Dict, type Lang } from "@/lib/i18n";
import { getMember } from "@/lib/member-auth";
import { getUi, pick } from "@/lib/queries";
import { pickText } from "@/lib/text3";
import ChangePasswordForm from "./ChangePasswordForm";
import { memberLogout } from "./actions";
import PrintButton from "./PrintButton";

// A page about one signed-in person: rendered per request, never cached, never indexed.
export const instant = false;

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  return { title: (await getUi(lang)).memAccountTitle, robots: { index: false, follow: false } };
}

export default function MemberPage({ params }: { params: Promise<{ lang: string }> }) {
  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl px-5 py-20" aria-busy="true" />}>
      <Account params={params} />
    </Suspense>
  );
}

async function Account({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const m = await getMember();
  if (!m) redirect(`/${lang}/member/login`);
  const ui = await getUi(lang);

  const db = getDb();
  const [[division], [branch], [department]] = await Promise.all([
    m.divisionId ? db.select().from(schema.divisions).where(eq(schema.divisions.id, m.divisionId)).limit(1) : [],
    m.branchId ? db.select().from(schema.branches).where(eq(schema.branches.id, m.branchId)).limit(1) : [],
    m.departmentId ? db.select().from(schema.departments).where(eq(schema.departments.id, m.departmentId)).limit(1) : [],
  ]);
  const locale = intlLocale(lang);
  const valid = m.validUntil ? new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(new Date(`${m.validUntil}T00:00:00`)) : ui.memOngoing;
  const rows: [string, string][] = [
    [ui.formDivision, division ? pick(lang, division.nameEn, division.nameHi, division.i18n?.name) : "-"],
    [ui.memBranch, branch ? pick(lang, branch.nameEn, branch.nameHi, branch.i18n?.name) : "-"],
    [ui.memDepartment, department ? pick(lang, department.nameEn, department.nameHi, department.i18n?.name) : "-"],
    ...(m.designation ? ([[ui.formDesignation, m.designation]] as [string, string][]) : []),
    [ui.memValid, valid],
  ];
  const crumbs = [{ href: `/${lang}`, label: ui.home }, { label: ui.memAccountTitle }];

  return (
    <>
      <div className="no-print">
        <PageHero lang={lang} title={ui.memAccountTitle} sub={m.name} crumbs={crumbs} />
      </div>
      <div className="mx-auto max-w-3xl space-y-8 px-5 py-10 sm:px-8 sm:py-14">
        {m.mustChangePassword ? (
          <>
            <p role="status" className="no-print border-2 border-brand bg-white px-5 py-4 font-semibold text-brand-deep">{ui.memMustChange}</p>
            <ChangePasswordForm ui={ui} lang={lang} />
          </>
        ) : (
          <>
            {/* The card. It prints on its own: everything else on the page is hidden when printing. */}
            <article aria-label={ui.memCardTitle} className="print-card overflow-hidden border border-brand-deep bg-brand text-light shadow-[0_8px_0_var(--gold)]">
              <div className="flex items-center gap-4 border-b border-white/15 bg-brand-deep px-5 py-4 sm:px-7">
                <Image src="/logo.jpg" alt="" width={56} height={56} className="h-14 w-14 rounded-full" />
                <div className="leading-tight">
                  <p className="text-lg font-bold sm:text-xl">{ui.memCardTitle}</p>
                  <p className="text-sm text-soft">{pick(lang, "Northern Railway Men's Union", "नॉर्दर्न रेलवे मेन्स यूनियन", undefined)}</p>
                </div>
              </div>
              <div className="px-5 py-6 sm:px-7">
                <p className="text-2xl font-medium sm:text-3xl">{m.name}</p>
                <p className="mt-1 text-soft">
                  {ui.memNo}: <span className="font-mono font-bold tracking-wide text-light">{m.membershipNo ?? "-"}</span>
                </p>
                <dl className="mt-5 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
                  {rows.map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-sm text-light/70">{label}</dt>
                      <dd className="font-medium">{value}</dd>
                    </div>
                  ))}
                  <div>
                    <dt className="text-sm text-light/70">{ui.memStatusLabel}</dt>
                    <dd className="font-medium text-signal">{ui.memActive}</dd>
                  </div>
                </dl>
              </div>
            </article>

            <div className="no-print flex flex-col gap-3 sm:flex-row">
              <PrintButton label={ui.memPrint} />
              <form action={memberLogout}>
                <input type="hidden" name="lang" value={lang} />
                <button type="submit" className="inline-flex min-h-12 w-full items-center justify-center rounded border-2 border-brand px-6 font-medium text-brand hover:bg-brand hover:text-white sm:w-auto">
                  {ui.memSignOut}
                </button>
              </form>
            </div>

            <MyPosts lang={lang} memberId={m.id} ui={ui} />

            <div className="no-print">
              <ChangePasswordForm ui={ui} lang={lang} />
            </div>
          </>
        )}
      </div>
    </>
  );
}

const STATUS_TONE: Record<string, string> = {
  pending: "bg-signal/25 text-ink",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-brand/10 text-brand",
  removed: "bg-line/70 text-muted",
};

/** The member's own feed posts and where each one stands, with the admin's note when it was not approved. */
async function MyPosts({ lang, memberId, ui }: { lang: Lang; memberId: number; ui: Dict }) {
  const posts = await getMyPosts(memberId);
  const when = (iso: string) => new Intl.DateTimeFormat(intlLocale(lang), { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(iso));
  return (
    <section aria-labelledby="my-posts" className="no-print rounded-md border border-line bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
        <h2 id="my-posts" className="text-lg font-semibold">
          {ui.fdMyPosts}
        </h2>
        <Link href={`/${lang}/feed`} className="inline-flex min-h-10 items-center rounded-full bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-deep">
          {ui.fdShare}
        </Link>
      </div>
      {posts.length === 0 ? (
        <p className="px-5 py-6 text-muted">{ui.fdNoPosts}</p>
      ) : (
        <ul className="divide-y divide-line">
          {posts.map((p) => (
            <li key={p.id} className="px-5 py-4">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className={`rounded-full px-2.5 py-0.5 font-bold ${STATUS_TONE[p.status] ?? STATUS_TONE.pending}`}>{ui[`fdSt_${p.status}` as keyof Dict] ?? p.status}</span>
                {p.topic && <span className="font-medium text-brand">{pickText(lang, p.topic)}</span>}
                <time dateTime={p.createdAt} className="ms-auto text-muted">
                  {when(p.createdAt)}
                </time>
              </div>
              <p className="mt-2 line-clamp-3 whitespace-pre-line break-words">{p.body}</p>
              {p.reviewNote && (p.status === "rejected" || p.status === "removed") && (
                <p className="mt-2 rounded-md bg-paper px-3 py-2 text-sm">
                  <span className="font-semibold">{ui.fdAdminNote}:</span> {p.reviewNote}
                </p>
              )}
              {p.status === "approved" && (
                <Link href={`/${lang}/feed/post/${p.id}`} className="mt-2 inline-flex min-h-10 items-center text-sm font-semibold text-brand hover:underline">
                  {ui.fdViewPost} →
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
