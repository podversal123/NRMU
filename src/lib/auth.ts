import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";

export { hashPassword, verifyPassword } from "./hash";

export type Role = "super_admin" | "editor" | "division_admin";
export type AdminSession = { id: number; email: string; name: string; role: Role; divisionId: number | null };

const COOKIE = "nrmu_admin";
const MAX_AGE = 60 * 60 * 12; // 12 hours

const secret = () => {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error("AUTH_SECRET is not configured");
  return s;
};

const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("base64url");

export async function startSession(userId: number) {
  const payload = Buffer.from(JSON.stringify({ uid: userId, exp: Date.now() + MAX_AGE * 1000 })).toString("base64url");
  const jar = await cookies();
  jar.set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

/** The signed-in admin, re-checked against the database on every request (so deactivation is immediate). */
export async function getAdmin(): Promise<AdminSession | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const good = Buffer.from(sign(payload));
  const given = Buffer.from(sig);
  if (good.length !== given.length || !timingSafeEqual(good, given)) return null;
  let data: { uid: number; exp: number };
  try {
    data = JSON.parse(Buffer.from(payload, "base64url").toString());
  } catch {
    return null;
  }
  if (!data.uid || data.exp < Date.now()) return null;
  const [u] = await getDb().select().from(schema.adminUsers).where(eq(schema.adminUsers.id, data.uid)).limit(1);
  if (!u || !u.active) return null;
  return { id: u.id, email: u.email, name: u.name, role: u.role as Role, divisionId: u.divisionId };
}

export async function requireAdmin(roles?: Role[]): Promise<AdminSession> {
  const a = await getAdmin();
  if (!a) redirect("/admin/login");
  if (roles && !roles.includes(a.role)) redirect("/admin?denied=1");
  return a;
}
