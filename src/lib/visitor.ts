import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";

/**
 * A browser that is not signed in, recognised by a random id in a cookie, so it can like a wall item once.
 * Only a one-way hash of the id is stored; the cookie carries no name, number or anything else.
 */
const COOKIE = "nrmu_v";
const MAX_AGE = 365 * 24 * 60 * 60;

const hash = (id: string) => createHash("sha256").update(`${process.env.AUTH_SECRET ?? ""}|visitor|${id}`).digest("hex").slice(0, 32);

/** The hashed id of this browser, or null when it has none yet. */
export async function visitorHash(): Promise<string | null> {
  const id = (await cookies()).get(COOKIE)?.value;
  return id && /^[a-f0-9]{32}$/.test(id) ? hash(id) : null;
}

/** The hashed id of this browser, giving it one first if needed (only from a server action, where cookies can be set). */
export async function ensureVisitorHash(): Promise<string> {
  const jar = await cookies();
  let id = jar.get(COOKIE)?.value;
  if (!id || !/^[a-f0-9]{32}$/.test(id)) {
    id = randomBytes(16).toString("hex");
    jar.set(COOKIE, id, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: MAX_AGE });
  }
  return hash(id);
}
