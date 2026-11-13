import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

/**
 * The database is reached over HTTPS. A brief network hiccup ("fetch failed", a connect timeout) would
 * otherwise crash the page, so a failed request is tried again a few times before giving up.
 * Only network failures are retried; an answer from the database (even an error) is returned as it is.
 */
const RETRIES = 3;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

neonConfig.fetchFunction = async (input: RequestInfo | URL, init?: RequestInit) => {
  let last: unknown;
  for (let i = 0; i <= RETRIES; i++) {
    try {
      return await fetch(input, init);
    } catch (e) {
      last = e;
      if (i < RETRIES) await wait(400 * (i + 1));
    }
  }
  throw last;
};

function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return drizzle(neon(url), { schema });
}

let _db: ReturnType<typeof createDb> | null = null;

export function getDb() {
  if (!_db) _db = createDb();
  return _db;
}

export { schema };
