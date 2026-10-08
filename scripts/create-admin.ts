/**
 * Creates (or resets the password of) an admin user.
 *
 *   npx tsx scripts/create-admin.ts <email> "<Full Name>" "<password>" [role]
 *
 * role: super_admin (default) | editor | division_admin
 * Run it from any folder; it finds .env.local next to the project on its own.
 */
import path from "node:path";
import { config } from "dotenv";
import { sql } from "drizzle-orm";
import { getDb } from "../src/db";
import { hashPassword } from "../src/lib/hash";

config({ path: path.resolve(__dirname, "..", ".env.local") });

const ROLES = ["super_admin", "editor", "division_admin"];
const fail = (msg: string): never => {
  console.error(`\nNot created: ${msg}\n`);
  process.exit(1);
};

async function main() {
  const [email, name, password, role = "super_admin"] = process.argv.slice(2);
  if (!email || !name || !password) {
    fail('three values are needed.\nExample:\n  npx tsx scripts/create-admin.ts you@example.com "Your Name" "AtLeast10Chars" super_admin');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(`"${email}" is not a valid email address.`);
  if (password.length < 10) fail(`the password has ${password.length} characters; it needs at least 10.`);
  if (!ROLES.includes(role)) fail(`role must be one of: ${ROLES.join(", ")}.`);
  if (!process.env.DATABASE_URL) fail("DATABASE_URL was not found. Is .env.local present in the project folder?");

  const db = getDb();
  const hash = await hashPassword(password);
  await db.execute(sql`
    insert into admin_users (email, name, password_hash, role)
    values (${email.toLowerCase()}, ${name}, ${hash}, ${role})
    on conflict (lower(email)) do update set password_hash = excluded.password_hash, name = excluded.name, role = excluded.role, active = true, failed_attempts = 0, locked_until = null`);

  // Read it back so the message is only printed when the account really exists.
  const check = (await db.execute(sql`select email, role from admin_users where lower(email) = ${email.toLowerCase()}`)) as unknown as { rows?: { email: string; role: string }[] } & { email: string; role: string }[];
  const row = (check.rows ?? check)[0];
  if (!row) fail("the account could not be read back from the database.");
  console.log(`\nAdmin ready: ${row.email} (${row.role})\nSign in at /admin/login with this email and the password you typed.\n`);
}

main().catch((e) => {
  console.error("\nNot created:", e instanceof Error ? e.message : e, "\n");
  process.exit(1);
});
