import { asc } from "drizzle-orm";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { SubmitButton } from "../../SubmitButton";
import { Card, Field, Notice, PageTitle, inputCls, td, th } from "../../ui";
import { addUser, resetPassword, setUserActive } from "./actions";

// Always depends on the signed-in admin, so it is rendered per request.
export const instant = false;
export const metadata = { title: "Admin users" };
const ERR: Record<string, string> = {
  details: "Enter a valid email and a name.",
  password: "Password must be at least 10 characters.",
  division: "Choose a division for a division admin.",
  exists: "An admin with this email already exists.",
};

export default async function UsersAdmin({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const me = await requireAdmin(["super_admin"]);
  const sp = await searchParams;
  const db = getDb();
  const [users, divisions] = await Promise.all([
    db.select({ u: schema.adminUsers, division: schema.divisions.nameEn }).from(schema.adminUsers).leftJoin(schema.divisions, eq(schema.divisions.id, schema.adminUsers.divisionId)).orderBy(asc(schema.adminUsers.id)),
    db.select().from(schema.divisions).orderBy(asc(schema.divisions.sort)),
  ]);

  return (
    <>
      <PageTitle title="Admin users" sub="People who can sign in to this panel." />
      {sp.saved && <Notice>Saved.</Notice>}
      {sp.error && <Notice kind="err">{ERR[sp.error] ?? "Something went wrong."}</Notice>}
      <div className="overflow-x-auto rounded-none border border-line bg-white">
        <table className="w-full text-[0.95rem]">
          <thead className="border-b border-line bg-paper"><tr><th className={th}>Name</th><th className={th}>Email</th><th className={th}>Role</th><th className={th}>Last sign-in</th><th className={th}>Actions</th></tr></thead>
          <tbody className="divide-y divide-line">
            {users.map(({ u, division }) => (
              <tr key={u.id}>
                <td className={`${td} font-semibold`}>{u.name}{!u.active && <span className="ml-2 rounded bg-soft px-1.5 py-0.5 text-xs">disabled</span>}</td>
                <td className={td}>{u.email}</td>
                <td className={td}>{u.role.replace("_", " ")}{division ? ` · ${division}` : ""}</td>
                <td className={`${td} text-sm text-muted`}>{u.lastLoginAt ? u.lastLoginAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }) : "Never"}</td>
                <td className={td}>
                  <div className="flex flex-wrap items-center gap-2">
                    {u.id !== me.id && (
                      <form action={setUserActive}>
                        <input type="hidden" name="id" value={u.id} />
                        <input type="hidden" name="active" value={u.active ? "0" : "1"} />
                        <button className="rounded-full border-2 border-ink px-3 py-2 text-sm font-semibold lg:py-1 hover:bg-ink hover:text-white">{u.active ? "Disable" : "Enable"}</button>
                      </form>
                    )}
                    <form action={resetPassword} className="flex gap-2">
                      <input type="hidden" name="id" value={u.id} />
                      <input type="password" name="password" placeholder="New password" minLength={10} autoComplete="new-password" className="w-36 rounded-lg border-2 border-line px-2 py-2 text-base lg:py-1 lg:text-sm" />
                      <button className="rounded-full bg-ink px-3 py-2 text-sm font-semibold lg:py-1 text-light hover:bg-brand">Reset</button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Card className="mt-8">
        <h2 className="font-display text-2xl font-bold">Add an admin</h2>
        <form action={addUser} className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="Name"><input name="name" required className={inputCls} /></Field>
          <Field label="Email"><input name="email" type="email" required className={inputCls} /></Field>
          <Field label="Role" hint="Editor: orders, pages, people, divisions. Division admin: only their own division's people and join requests.">
            <select name="role" defaultValue="editor" className={inputCls}>
              <option value="editor">Editor</option>
              <option value="division_admin">Division admin</option>
              <option value="super_admin">Super admin</option>
            </select>
          </Field>
          <Field label="Division (for division admin)">
            <select name="divisionId" defaultValue="" className={inputCls}>
              <option value="">–</option>
              {divisions.map((d) => <option key={d.id} value={d.id}>{d.nameEn}</option>)}
            </select>
          </Field>
          <Field label="Password" hint="At least 10 characters."><input name="password" type="password" minLength={10} required autoComplete="new-password" className={inputCls} /></Field>
          <div className="flex items-end"><SubmitButton>Add admin</SubmitButton></div>
        </form>
      </Card>
    </>
  );
}
