/**
 * Creates (or resets the password of) an admin user.
 * Usage: npx tsx scripts/create-admin.ts <email> "<Full Name>" "<password>" [role]
 * role: super_admin (default) | editor | division_admin
 */
import { config } from "dotenv";
import { sql } from "drizzle-orm";
import { getDb } from "../src/db";
import { hashPassword } from "../src/lib/hash";

config({ path: ".env.local" });

async function main() {
  const [email, name, password, role = "super_admin"] = process.argv.slice(2);
  if (!email || !name || !password) {
    console.error('Usage: npx tsx scripts/create-admin.ts <email> "<Full Name>" "<password>" [role]');
    process.exit(1);
  }
  if (password.length < 10) {
    console.error("Password must be at least 10 characters.");
    process.exit(1);
  }
  const hash = await hashPassword(password);
  await getDb().execute(sql`
    insert into admin_users (email, name, password_hash, role)
    values (${email.toLowerCase()}, ${name}, ${hash}, ${role})
    on conflict (lower(email)) do update set password_hash = excluded.password_hash, name = excluded.name, role = excluded.role, active = true, failed_attempts = 0, locked_until = null`);
  console.log(`Admin ready: ${email.toLowerCase()} (${role})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
