import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { eq } from "drizzle-orm";
import PageHero from "@/components/PageHero";
import { getDb, schema } from "@/db";
import { isLang } from "@/lib/i18n";
import { getMember } from "@/lib/member-auth";
import { getUi, pick } from "@/lib/queries";
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
  const locale = lang === "hi" ? "hi-IN" : "en-IN";
  const valid = m.validUntil ? new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(new Date(`${m.validUntil}T00:00:00`)) : ui.memOngoing;
  const rows: [string, string][] = [
    [ui.formDivision, division ? pick(lang, division.nameEn, division.nameHi) : "-"],
    [ui.memBranch, branch ? pick(lang, branch.nameEn, branch.nameHi) : "-"],
    [ui.memDepartment, department ? pick(lang, department.nameEn, department.nameHi) : "-"],
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
            <article aria-label={ui.memCardTitle} className="print-card overflow-hidden border border-ink bg-ink text-light shadow-[0_8px_0_var(--gold)]">
              <div className="flex items-center gap-4 border-b border-white/15 bg-black/20 px-5 py-4 sm:px-7">
                <Image src="/logo.jpg" alt="" width={56} height={56} className="h-14 w-14 rounded-full" />
                <div className="leading-tight">
                  <p className="text-lg font-bold sm:text-xl">{ui.memCardTitle}</p>
                  <p className="text-sm text-soft">{pick(lang, "Northern Railway Men's Union", "उत्तर रेलवे मेन्स यूनियन")}</p>
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
                <button type="submit" className="inline-flex min-h-12 w-full items-center justify-center rounded border-2 border-ink px-6 font-medium hover:bg-ink hover:text-light sm:w-auto">
                  {ui.memSignOut}
                </button>
              </form>
            </div>

            <div className="no-print">
              <ChangePasswordForm ui={ui} lang={lang} />
            </div>
          </>
        )}
      </div>
    </>
  );
}
