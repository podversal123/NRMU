/**
 * Loads the union's office bearers list and youth convenors list (scripts/data/office-bearers-2026.json, made
 * from the two Excel sheets the union sent) into the database:
 *
 *  - central office bearers: replaced by the list. The two featured leaders keep their rows (and their place
 *    on the home page), with their post, place and phone brought up to date;
 *  - every division's and every branch's committee: replaced by the list. Branches keep their ids and names;
 *  - the youth wing committee: replaced by the list (zonal, divisional and branch convenors).
 *
 * Dates of birth and e-mail addresses in the sheets are not carried over; only names, posts, places and phones.
 * Run `npx drizzle-kit migrate` first (the youth list needs committee_members.branch_name), and take a backup
 * with scripts/backup.ts. Without --apply it only prints what it would do.
 *
 *   npx tsx scripts/import-office-bearers.ts [--apply]
 */
import fs from "node:fs";
import path from "node:path";
import { config } from "dotenv";

config({ path: path.resolve(__dirname, "..", ".env.local") });

type Row = { role: string; name: string; post: string | null; phone: string | null };
type Data = {
  central: Row[];
  divisions: Record<string, { body: Row[]; branches: Record<string, { label: string; people: Row[] }> }>;
  youth: { role: string; division: string | null; branch?: string; name: string; phone: string | null }[];
};

/** Posts of office bearers: [role key in the data, scope, English title, Hindi title, sort]. Existing titles are found by scope and English name. */
const DESIGNATIONS: [string, string, string, string, number][] = [
  ["central_gs", "central", "General Secretary", "महामंत्री", 1],
  ["central_president", "central", "President", "अध्यक्ष", 2],
  ["central_vp", "central", "Central Vice President", "केंद्रीय उपाध्यक्ष", 3],
  ["central_ags", "central", "Assistant General Secretary", "सहायक महामंत्री", 4],
  ["central_treasurer", "central", "Central Treasurer", "केंद्रीय कोषाध्यक्ष", 5],
  ["division_president", "division_president", "Divisional President", "मंडल अध्यक्ष", 1],
  ["div_vp", "division_body", "Divisional Vice President", "मंडल उपाध्यक्ष", 2],
  ["division_secretary", "division_secretary", "Divisional Secretary", "मंडल सचिव", 3],
  ["div_asst", "division_body", "Assistant Divisional Secretary", "सहायक मंडल सचिव", 4],
  ["div_treasurer", "division_body", "Divisional Treasurer", "मंडल कोषाध्यक्ष", 5],
  ["branch_president", "branch_president", "Branch President", "शाखा अध्यक्ष", 1],
  ["br_vp", "branch_body", "Branch Vice President", "शाखा उपाध्यक्ष", 2],
  ["branch_secretary", "branch_secretary", "Branch Secretary", "शाखा सचिव", 3],
  ["br_asst", "branch_body", "Assistant Branch Secretary", "सहायक शाखा सचिव", 4],
  ["br_treasurer", "branch_body", "Branch Treasurer", "शाखा कोषाध्यक्ष", 5],
];

/** Posts in the youth wing: [role key, English, Hindi, sort]. */
const YOUTH: Record<string, [string, string, number]> = {
  zonal: ["Zonal Convenor", "ज़ोनल संयोजक", 0],
  zonal_co: ["Zonal Co-Convenor", "ज़ोनल सह-संयोजक", 1],
  prabhari: ["Divisional Prabhari", "मंडल प्रभारी", 10],
  div_convenor: ["Divisional Youth Convenor", "मंडल युवा संयोजक", 20],
  div_co: ["Divisional Youth Co-Convenor", "मंडल युवा सह-संयोजक", 30],
  branch: ["Branch Youth Convenor", "शाखा युवा संयोजक", 100],
};

/** The featured leaders are matched by surname, so their rows (and the home page that shows them) stay. */
const FEATURED_MATCH: Record<string, RegExp> = { central_gs: /mishra/i, central_president: /tyagi/i };

async function main() {
  const apply = process.argv.includes("--apply");
  const data: Data = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "office-bearers-2026.json"), "utf8"));
  const { getDb, schema } = await import("../src/db");
  const { and, eq, ne, inArray } = await import("drizzle-orm");
  const db = getDb();

  const divisions = await db.select().from(schema.divisions);
  const divId = (slug: string) => {
    const d = divisions.find((x) => x.slug === slug);
    if (!d) throw new Error(`No division "${slug}"`);
    return d.id;
  };
  const branchIds = new Set((await db.select({ id: schema.branches.id }).from(schema.branches)).map((b) => b.id));
  for (const d of Object.values(data.divisions)) for (const id of Object.keys(d.branches)) if (!branchIds.has(Number(id))) throw new Error(`No branch ${id}`);

  // 1. designations: add the new titles, put every title in the order the committees are read in
  const existing = await db.select().from(schema.designations);
  const designationId: Record<string, number> = {};
  const missing = DESIGNATIONS.filter(([, scope, en]) => !existing.some((d) => d.scope === scope && d.nameEn === en));
  console.log(`Designations: ${missing.length} to add (${missing.map((m) => m[2]).join(", ") || "none"}).`);
  if (apply) {
    for (const [, scope, nameEn, nameHi, sort] of missing) await db.insert(schema.designations).values({ scope, nameEn, nameHi, sort });
    for (const [, scope, nameEn, , sort] of DESIGNATIONS) await db.update(schema.designations).set({ sort }).where(and(eq(schema.designations.scope, scope), eq(schema.designations.nameEn, nameEn)));
    const now = await db.select().from(schema.designations);
    for (const [key, scope, nameEn] of DESIGNATIONS) designationId[key] = now.find((d) => d.scope === scope && d.nameEn === nameEn)!.id;
  } else for (const [key, scope, nameEn] of DESIGNATIONS) designationId[key] = existing.find((d) => d.scope === scope && d.nameEn === nameEn)?.id ?? -1;
  const scopeOf = Object.fromEntries(DESIGNATIONS.map(([key, scope]) => [key, scope]));

  // 2. central: the featured leaders are updated in place, everyone else replaced
  const oldCentral = await db.select().from(schema.officeBearers).where(eq(schema.officeBearers.scope, "central"));
  const keep = new Map<number, Row & { sort: number }>();
  const fresh: (Row & { sort: number })[] = [];
  data.central.forEach((r, sort) => {
    const match = FEATURED_MATCH[r.role] && oldCentral.find((o) => o.featured && FEATURED_MATCH[r.role].test(o.nameEn));
    if (match) keep.set(match.id, { ...r, sort });
    else fresh.push({ ...r, sort });
  });
  console.log(`Central: ${keep.size} featured kept and updated (${[...keep.keys()].map((id) => oldCentral.find((o) => o.id === id)!.nameEn).join(", ")}), ${oldCentral.length - keep.size} old rows removed, ${fresh.length} added.`);

  // 3. divisions and branches
  type Insert = typeof schema.officeBearers.$inferInsert;
  const people: Insert[] = [];
  const row = (r: Row, sort: number, divisionId: number | null, branchId: number | null): Insert => ({
    scope: scopeOf[r.role],
    divisionId,
    branchId,
    nameEn: r.name,
    designationId: designationId[r.role],
    placeLabel: r.post,
    phone: r.phone,
    sort,
  });
  for (const r of fresh) people.push(row(r, r.sort, null, null));
  for (const [slug, d] of Object.entries(data.divisions)) {
    const id = divId(slug);
    d.body.forEach((r, i) => people.push(row(r, i, id, null)));
    for (const [branchId, b] of Object.entries(d.branches)) b.people.forEach((r, i) => people.push(row(r, i, id, Number(branchId))));
  }
  const oldOther = await db.select({ id: schema.officeBearers.id }).from(schema.officeBearers).where(ne(schema.officeBearers.scope, "central"));
  const byScope = people.reduce<Record<string, number>>((a, p) => ((a[p.scope] = (a[p.scope] ?? 0) + 1), a), {});
  console.log(`Divisions and branches: ${oldOther.length} old rows removed, ${people.length - fresh.length} added (${JSON.stringify(byScope)}).`);

  // 4. youth wing
  const oldYouth = await db.select({ id: schema.committeeMembers.id }).from(schema.committeeMembers).where(eq(schema.committeeMembers.wing, "youth"));
  const youth = data.youth.map((y, i) => {
    const [designationEn, designationHi, base] = YOUTH[y.role];
    return { wing: "youth", nameEn: y.name, designationEn, designationHi, divisionId: y.division ? divId(y.division) : null, branchName: y.branch ?? null, phone: y.phone, sort: base + (y.role === "branch" ? i : 0) };
  });
  console.log(`Youth wing: ${oldYouth.length} old rows removed, ${youth.length} added.`);

  if (!apply) {
    console.log("\nDry run: nothing was changed. Run again with --apply to write.");
    return;
  }

  // everything below runs as one transaction: all of it is written, or none of it
  const chunks = <T>(a: T[], n: number) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
  const removeCentral = oldCentral.filter((o) => !keep.has(o.id)).map((o) => o.id);
  await db.batch([
    ...[...keep].map(([id, r]) => db.update(schema.officeBearers).set({ designationId: designationId[r.role], placeLabel: r.post, phone: r.phone, sort: r.sort, active: true }).where(eq(schema.officeBearers.id, id))),
    db.delete(schema.officeBearers).where(removeCentral.length ? inArray(schema.officeBearers.id, removeCentral) : eq(schema.officeBearers.id, -1)),
    db.delete(schema.officeBearers).where(ne(schema.officeBearers.scope, "central")),
    ...chunks(people, 200).map((c) => db.insert(schema.officeBearers).values(c)),
    db.delete(schema.committeeMembers).where(eq(schema.committeeMembers.wing, "youth")),
    ...chunks(youth, 200).map((c) => db.insert(schema.committeeMembers).values(c)),
  ] as unknown as Parameters<typeof db.batch>[0]);
  console.log("\nDone. Restart the dev server (or redeploy) so the cached pages show the new lists.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
