/**
 * Starting data for the feed: the topics a member can post under, and the "Feed" entry in the header menu.
 * Adds only what is missing, so running it again changes nothing; everything stays editable in the admin panel.
 * Run: npx tsx scripts/add-feed.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

const TOPICS: [string, string, string][] = [
  ["Grievance", "शिकायत", "alert"],
  ["Suggestion", "सुझाव", "bulb"],
  ["General", "सामान्य", "chat"],
];

async function main() {
  const { getDb, schema } = await import("../src/db");
  const { and, eq, isNull, sql } = await import("drizzle-orm");
  const db = getDb();

  const [{ n }] = (await db.execute(sql`select count(*)::int as n from feed_topics`)).rows as { n: number }[];
  if (Number(n) === 0) {
    await db.insert(schema.feedTopics).values(TOPICS.map(([nameEn, nameHi, icon], sort) => ({ nameEn, nameHi, icon, sort })));
    console.log(`${TOPICS.length} feed topics added.`);
  } else console.log("Feed topics already present, left as they are.");

  const [have] = await db.select({ id: schema.navItems.id }).from(schema.navItems).where(and(eq(schema.navItems.area, "header"), eq(schema.navItems.href, "/feed"))).limit(1);
  if (!have) {
    // placed right after "Orders & Circulars" (same sort number, later id)
    const [orders] = await db
      .select({ sort: schema.navItems.sort })
      .from(schema.navItems)
      .where(and(eq(schema.navItems.area, "header"), eq(schema.navItems.href, "/orders"), isNull(schema.navItems.parentId)))
      .limit(1);
    await db.insert(schema.navItems).values({ area: "header", labelEn: "NRMU Wall", labelHi: "एनआरएमयू वॉल", href: "/feed", sort: orders?.sort ?? 1, active: true });
    console.log("Header menu entry 'NRMU Wall' added.");
  } else console.log("Header menu entry for /feed already present.");
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
