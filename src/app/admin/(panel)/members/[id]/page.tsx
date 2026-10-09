import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { fmtWhen } from "@/lib/meetings";
import { DeleteButton, SubmitButton } from "../../../SubmitButton";
import { Card, Field, Notice, PageTitle, inputCls } from "../../../ui";
import { bulkMembers, deleteMember, saveMember } from "../actions";
import TempPassword from "./TempPassword";

// Always depends on the signed-in admin, so it is rendered per request.
export const instant = false;
export const metadata = { title: "Member" };

const ERRORS: Record<string, string> = {
  required: "A name and a division are required.",
  email: "That email address does not look right.",
  branch: "The branch must belong to the chosen division.",
};
const STATUS: Record<string, string> = { pending: "Waiting for approval", active: "Active", suspended: "Suspended", rejected: "Not approved" };

export default async function MemberAdmin({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const admin = await requireAdmin(["super_admin", "division_admin"]);
  const { id } = await params;
  const sp = await searchParams;
  if (!/^\d+$/.test(id)) notFound();
  const db = getDb();
  const [m] = await db
    .select()
    .from(schema.members)
    .where(and(eq(schema.members.id, Number(id)), admin.role === "division_admin" ? eq(schema.members.divisionId, admin.divisionId ?? -1) : undefined))
    .limit(1);
  if (!m) notFound();

  const [divisions, branches, departments] = await Promise.all([
    db.select().from(schema.divisions).orderBy(asc(schema.divisions.sort)),
    db.select().from(schema.branches).orderBy(asc(schema.branches.divisionId), asc(schema.branches.sort)),
    db.select().from(schema.departments).orderBy(asc(schema.departments.sort)),
  ]);
  const ownBranches = branches.filter((b) => b.divisionId === m.divisionId);
  const act = (intent: string, label: string, primary = false) => (
    <form action={bulkMembers} key={intent}>
      <input type="hidden" name="ids" value={m.id} />
      <input type="hidden" name="back" value={`/admin/members/${m.id}`} />
      <button name="intent" value={intent} className={primary ? "btn-primary px-6 py-2.5" : "rounded-full border-2 border-ink px-5 py-2.5 text-sm font-semibold hover:bg-ink hover:text-white"}>{label}</button>
    </form>
  );

  return (
    <>
      <PageTitle
        title={m.name}
        sub={`${STATUS[m.status] ?? m.status}${m.membershipNo ? ` · ${m.membershipNo}` : ""}`}
        action={<Link href="/admin/members" className="inline-block py-2 text-sm font-semibold text-brand">← All members</Link>}
      />
      {sp.saved && <Notice>Saved.</Notice>}
      {sp.done && <Notice>Done.</Notice>}
      {sp.error && <Notice kind="err">{ERRORS[sp.error] ?? "Please check the form."}</Notice>}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <form action={saveMember}>
          <input type="hidden" name="id" value={m.id} />
          <Card className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Name"><input name="name" required defaultValue={m.name} className={inputCls} /></Field>
            <Field label="Mobile number" hint="The member signs in with this. It cannot be changed here."><input value={m.mobile} readOnly className={`${inputCls} bg-paper`} /></Field>
            <Field label="Email"><input name="email" defaultValue={m.email ?? ""} className={inputCls} /></Field>
            <Field label="Employee ID"><input name="employeeId" defaultValue={m.employeeId ?? ""} className={inputCls} /></Field>
            <Field label="Division">
              <select name="divisionId" defaultValue={m.divisionId ?? ""} disabled={admin.role === "division_admin"} className={inputCls}>
                {divisions.map((d) => <option key={d.id} value={d.id}>{d.nameEn}</option>)}
              </select>
            </Field>
            <Field label="Branch" hint="Only the branches of the division are listed. Save the division first if you change it.">
              <select name="branchId" defaultValue={m.branchId ?? ""} className={inputCls}>
                <option value="">Not set</option>
                {ownBranches.map((b) => <option key={b.id} value={b.id}>{b.nameEn}</option>)}
              </select>
            </Field>
            <Field label="Department">
              <select name="departmentId" defaultValue={m.departmentId ?? ""} className={inputCls}>
                <option value="">Not set</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.nameEn}</option>)}
              </select>
            </Field>
            <Field label="Designation"><input name="designation" defaultValue={m.designation ?? ""} className={inputCls} /></Field>
            <Field label="Valid until" hint="Leave empty for an ongoing membership."><input type="date" name="validUntil" defaultValue={m.validUntil ?? ""} className={inputCls} /></Field>
            <div className="sm:col-span-2"><SubmitButton className="btn-primary px-6 py-3">Save</SubmitButton></div>
          </Card>
        </form>

        <div className="space-y-6">
          <Card className="space-y-4">
            <h2 className="font-display text-xl font-bold">Membership</h2>
            <div className="flex flex-wrap gap-3">
              {m.status === "pending" && [act("approve", "Approve", true), act("reject", "Not approved")]}
              {m.status === "active" && act("suspend", "Suspend")}
              {(m.status === "suspended" || m.status === "rejected") && act("reactivate", "Reactivate", true)}
            </div>
            <dl className="space-y-2 text-sm">
              <div><dt className="text-muted">Registered</dt><dd className="font-medium">{fmtWhen(m.createdAt)}</dd></div>
              <div><dt className="text-muted">Agreed to the privacy terms</dt><dd className="font-medium">{fmtWhen(m.consentAt)}</dd></div>
              {m.approvedAt && <div><dt className="text-muted">Approved</dt><dd className="font-medium">{fmtWhen(m.approvedAt)}</dd></div>}
              <div><dt className="text-muted">Last signed in</dt><dd className="font-medium">{m.lastLoginAt ? fmtWhen(m.lastLoginAt) : "Never"}</dd></div>
            </dl>
          </Card>
          <Card className="space-y-3">
            <h2 className="font-display text-xl font-bold">Password</h2>
            <p className="text-sm text-muted">If the member forgot their password, give them a temporary one. They must choose their own the next time they sign in.</p>
            <TempPassword id={m.id} />
          </Card>
          {m.status === "rejected" && admin.role === "super_admin" && (
            <form action={deleteMember}>
              <input type="hidden" name="id" value={m.id} />
              <DeleteButton label="Delete this registration" confirmText="Delete this registration and the person's details permanently?" />
            </form>
          )}
        </div>
      </div>
    </>
  );
}
