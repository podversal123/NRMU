/**
 * Seeds the database from the scraped nrmu.net content.
 * Usage: npx tsx scripts/seed.ts   (expects DATABASE_URL in .env.local)
 *
 * Inputs (local only, not committed):
 *   data/index.json, data/posts/<id>.json, data/categories.json, data/pages.json
 *   data/branches.txt  (division/branch rows exported from "Branch Name.xls")
 */
import { config } from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { sql } from "drizzle-orm";
import { getDb, schema } from "../src/db";

config({ path: ".env.local" });

const ROOT = path.resolve(__dirname, "..");
const DATA = path.join(ROOT, "data");
const read = <T,>(f: string) => JSON.parse(fs.readFileSync(path.join(DATA, f), "utf8")) as T;

const NAMED: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—",
  lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”", hellip: "…", bull: "•",
};
const decode = (s: string) =>
  s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => NAMED[n.toLowerCase()] ?? m)
    .replace(/�/g, "-");
const toText = (html: string) =>
  decode(html.replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();

const chunk = <T,>(arr: T[], n: number) => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
};

type IndexRow = { id: number; date: string; slug: string; title: string; excerpt: string; cats: number[]; pdfs: number; pdf: string | null };
type CatRow = { id: number; slug: string; parent: number; name: string };
type PageRow = { id: number; slug: string; title: string; html: string };

const db = getDb();

async function reset() {
  // Only the imported content is replaced. Settings, uploads, gallery, join requests, grievances,
  // events and admin accounts are never touched by a re-seed.
  for (const table of ["posts", "categories", "pages", "branches", "office_bearers", "designations", "divisions"]) {
    await db.execute(sql.raw(`delete from ${table}`));
  }
}

async function seedContent() {
  const cats = read<CatRow[]>("categories.json");
  await db.insert(schema.categories).values(
    cats.map((c, i) => ({ id: c.id, slug: c.slug, parentId: c.parent || null, nameEn: c.name, hidden: [1, 1042].includes(c.id), sort: i })), // 1 = Uncategorized, 1042 = Featured
  );

  const deadFile = path.join(DATA, "dead-files.json");
  const dead = new Set<string>(fs.existsSync(deadFile) ? Object.values(JSON.parse(fs.readFileSync(deadFile, "utf8")) as Record<string, string[]>).flat() : []);
  const fileKind = (u: string) => (/\.pdf$/i.test(u) ? "pdf" : /\.(docx?|rtf)$/i.test(u) ? "doc" : /\.(xlsx?|csv)$/i.test(u) ? "sheet" : /\.(jpe?g|png|gif|webp)$/i.test(u) ? "image" : "file");
  const fileName = (u: string) => decodeURIComponent(u.split("/").pop() ?? "").replace(/\.[A-Za-z0-9]+$/, "").replace(/[-_]+/g, " ").trim() || null;

  const index = read<IndexRow[]>("index.json");
  const known = new Set(cats.map((c) => c.id));
  let n = 0;
  for (const part of chunk(index, 60)) {
    const fileRows: (typeof schema.postFiles.$inferInsert)[] = [];
    const rows = part.map((p) => {
      const html = (JSON.parse(fs.readFileSync(path.join(DATA, "posts", `${p.id}.json`), "utf8")) as { html: string }).html;
      const files = [...new Set([...html.matchAll(/href="([^"]+\.(?:pdf|docx?|xlsx?))"/gi)].map((m) => m[1]))].filter((u) => !dead.has(u));
      files.forEach((url, i) => fileRows.push({ postId: p.id, url, name: fileName(url), kind: fileKind(url), sort: i }));
      const img = html.match(/<img[^>]+src="([^"]+)"/i)?.[1] ?? null;
      const thumbUrl = img && !/airfheader/i.test(img) ? img.replace(/-\d+x\d+(\.[a-z]+)$/i, "$1").replace(/^http:/, "https:") : null;
      return {
        id: p.id,
        slug: p.slug,
        thumbUrl,
        titleEn: decode(p.title),
        excerpt: decode(p.excerpt),
        contentHtml: html,
        bodyText: toText(html).slice(0, 30000),
        publishedAt: p.date,
      };
    });
    await db.insert(schema.posts).values(rows);
    if (fileRows.length) await db.insert(schema.postFiles).values(fileRows);
    const links = part.flatMap((p) => p.cats.filter((c) => known.has(c)).map((c) => ({ postId: p.id, categoryId: c })));
    if (links.length) await db.insert(schema.postCategories).values(links).onConflictDoNothing();
    n += part.length;
    process.stdout.write(`\rposts ${n}/${index.length}`);
  }
  console.log();

  const pages = read<PageRow[]>("pages.json");
  await db.insert(schema.pages).values(pages.map((p) => ({ slug: p.slug, titleEn: decode(p.title), contentHtml: p.html })));
  console.log("pages", pages.length);
}

const DIVISIONS: { slug: string; key: string; en: string; hi: string; active: boolean }[] = [
  { slug: "headquarter", key: "Headquarter", en: "Headquarter", hi: "मुख्यालय", active: true },
  { slug: "delhi", key: "Delhi", en: "Delhi", hi: "दिल्ली", active: true },
  { slug: "ambala", key: "Ambala", en: "Ambala", hi: "अंबाला", active: true },
  { slug: "firozpur", key: "Firozpur", en: "Firozpur", hi: "फिरोज़पुर", active: true },
  { slug: "lucknow", key: "Lucknow", en: "Lucknow", hi: "लखनऊ", active: true },
  { slug: "moradabad", key: "Moradabad", en: "Moradabad", hi: "मुरादाबाद", active: true },
  { slug: "workshop", key: "Workshop", en: "Workshop", hi: "कार्यशाला", active: true },
  { slug: "bridge", key: "Bridge", en: "Bridge", hi: "ब्रिज", active: true },
  { slug: "accounts", key: "Accounts", en: "Accounts", hi: "लेखा", active: true },
  // Present in the branch spreadsheet but not on the live website; hidden until confirmed.
  { slug: "jammu", key: "Jammu", en: "Jammu", hi: "जम्मू", active: false },
];

// Addresses of the division pages on the old WordPress site, used to redirect old links.
const LEGACY_SLUG: Record<string, string> = {
  accounts: "accounts-division", bridge: "bridge-division", ambala: "ambala-division", delhi: "delhi-division",
  firozpur: "firozpur-division", headquarter: "headquarter-division", lucknow: "lukcnow-division-nrmu",
  moradabad: "moradabad-division", workshop: "workshop-division",
};

async function seedDivisions() {
  const divs = await db
    .insert(schema.divisions)
    .values(DIVISIONS.map((d, i) => ({ slug: d.slug, nameEn: d.en, nameHi: d.hi, legacySlug: LEGACY_SLUG[d.slug] ?? null, sort: i, active: d.active })))
    .returning();
  const bySlug = new Map(divs.map((d) => [d.slug, d.id]));

  // Branch rows from the spreadsheet export: "row|A|B|C|D" (A = division header, C = branch)
  const lines = fs.readFileSync(path.join(DATA, "branches.txt"), "utf8").split(/\r?\n/);
  let current: number | null = null;
  const rows: { divisionId: number; nameEn: string; sort: number }[] = [];
  let sort = 0;
  for (const line of lines) {
    const [, a = "", , c = ""] = line.replace(/^﻿/, "").split("|").map((s) => s.trim());
    if (a && /Division$/.test(a) && !/^Name of/i.test(a)) {
      const key = a.replace(/\s*Division$/i, "").trim();
      const d = DIVISIONS.find((x) => x.key.toLowerCase() === key.toLowerCase());
      current = d ? (bySlug.get(d.slug) ?? null) : null;
      sort = 0;
      continue;
    }
    if (/^Total$/i.test(c)) {
      current = null;
      continue;
    }
    if (!current || !c || /^Name of/i.test(c)) continue;
    rows.push({ divisionId: current, nameEn: c, sort: sort++ });
  }
  await db.insert(schema.branches).values(rows);
  console.log("divisions", divs.length, "branches", rows.length);
  return bySlug;
}

const DIV_KEYWORDS: [RegExp, string][] = [
  [/accounts?/i, "accounts"],
  [/\bMB\b|moradabad/i, "moradabad"],
  [/\bHQ\b|head\s?quarter/i, "headquarter"],
  [/delhi/i, "delhi"],
  [/\bUMB\b|ambala/i, "ambala"],
  [/workshop/i, "workshop"],
  [/bridge/i, "bridge"],
  [/\bFZR\b|firozpur|ferozepur/i, "firozpur"],
  [/\bLKO\b|lucknow/i, "lucknow"],
];
const divisionFromText = (s: string, fallback: string | null) => {
  for (const [re, slug] of DIV_KEYWORDS) if (re.test(s)) return slug;
  return fallback;
};

function parsePeople(html: string) {
  const cells = [...html.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => m[1]);
  const people: { name: string; designation: string; address: string; phone: string | null }[] = [];
  for (const cell of cells) {
    const lines = cell
      .split(/<br\s*\/?>/i)
      .map((l) => toText(l).replace(/[,\s]+$/, "").trim())
      .filter(Boolean);
    if (lines.length < 2) continue;
    const [name, designation, ...rest] = lines;
    const text = rest.join(", ");
    const phone = (text.match(/(?:\+?91[- ]?)?0?[6-9]\d{9}/) ?? [null])[0];
    people.push({ name, designation, address: rest.join(", "), phone });
  }
  return people;
}

const DESIGNATIONS: { key: RegExp; scope: string; en: string; hi: string; sort: number }[] = [
  { key: /^general secretary$/i, scope: "central", en: "General Secretary", hi: "महामंत्री", sort: 1 },
  { key: /^president$/i, scope: "central", en: "President", hi: "अध्यक्ष", sort: 2 },
  { key: /central vice pres/i, scope: "central", en: "Central Vice President", hi: "केंद्रीय उपाध्यक्ष", sort: 3 },
  { key: /^(assistant|asstt\.?) general secretary/i, scope: "central", en: "Assistant General Secretary", hi: "सहायक महामंत्री", sort: 4 },
  { key: /central treasurer/i, scope: "central", en: "Central Treasurer", hi: "केंद्रीय कोषाध्यक्ष", sort: 5 },
  { key: /^divisional president$/i, scope: "division_president", en: "Divisional President", hi: "मंडल अध्यक्ष", sort: 1 },
  { key: /^divisional secretary$/i, scope: "division_secretary", en: "Divisional Secretary", hi: "मंडल सचिव", sort: 1 },
  { key: /^\.?(br\.?|branch)[\s.,]*(secy\.?|secretary)?$/i, scope: "branch_secretary", en: "Branch Secretary", hi: "शाखा सचिव", sort: 1 },
];

async function seedOfficials(divIds: Map<string, number>) {
  const desigIds = new Map<string, number>();
  for (const d of DESIGNATIONS) {
    const [row] = await db.insert(schema.designations).values({ scope: d.scope, nameEn: d.en, nameHi: d.hi, sort: d.sort }).returning({ id: schema.designations.id });
    desigIds.set(d.scope + "|" + d.en, row.id);
  }
  const pages = read<PageRow[]>("pages.json");
  const bySlug = new Map(pages.map((p) => [p.slug, p]));
  const rows: (typeof schema.officeBearers.$inferInsert)[] = [];
  const divPageMap: Record<string, string> = {
    "accounts-division": "accounts", "bridge-division": "bridge", "ambala-division": "ambala", "delhi-division": "delhi",
    "firozpur-division": "firozpur", "headquarter-division": "headquarter", "lukcnow-division-nrmu": "lucknow",
    "moradabad-division": "moradabad", "workshop-division": "workshop",
  };

  // "Br. Secy. / NRMU / HNZM" -> designation "Branch Secretary" + place "HNZM"
  const classify = (scope: string, text: string) => {
    const parts = text.split("/").map((x) => x.trim()).filter((x) => x && !/^nrmu\.?$/i.test(x.replace(/\s*\.\s*$/, "")));
    const base = (parts[0] ?? "").replace(/\s+NRMU\s*\.?$/i, "").replace(/\s*\.\s*$/, "").trim();
    const match = DESIGNATIONS.find((d) => d.scope === scope && d.key.test(base));
    if (!match) throw new Error(`Unknown designation "${text}" (${scope})`);
    const place = scope === "branch_secretary" ? parts.slice(1).join(" / ") || null : null;
    return { designationId: desigIds.get(scope + "|" + match.en)!, placeLabel: place };
  };

  const push = (scope: string, people: ReturnType<typeof parsePeople>, forcedDiv: string | null, startSort = 0) =>
    people.forEach((p, i) => {
      const slug = forcedDiv ?? divisionFromText(p.designation, null);
      rows.push({
        scope,
        divisionId: slug ? (divIds.get(slug) ?? null) : null,
        nameEn: p.name,
        ...classify(scope, p.designation),
        addressEn: p.address || null,
        phone: p.phone,
        sort: startSort + i,
      });
    });

  const central = bySlug.get("central-office-bearers");
  if (central) push("central", parsePeople(central.html), null);
  const pres = bySlug.get("divisional-president");
  if (pres) push("division_president", parsePeople(pres.html), null);
  const secs = bySlug.get("divisional-secretaries");
  if (secs) push("division_secretary", parsePeople(secs.html), null);
  for (const [pageSlug, divSlug] of Object.entries(divPageMap)) {
    const pg = bySlug.get(pageSlug);
    if (pg) push("branch_secretary", parsePeople(pg.html), divSlug);
  }

  // President and General Secretary are shown on the home page.
  const idToName = new Map([...desigIds.entries()].map(([k, v]) => [v, k.split("|")[1]]));
  for (const r of rows) {
    if (r.scope !== "central") continue;
    const title = idToName.get(r.designationId!);
    if (title === "General Secretary") { r.featured = true; r.sort = 0; }
    else if (title === "President") { r.featured = true; r.sort = 1; }
  }
  for (const part of chunk(rows, 100)) await db.insert(schema.officeBearers).values(part);
  console.log("office bearers", rows.length);
}

type Pair = { en: string; hi: string };
const SETTINGS: Record<string, Pair> = {
  "org.name": { en: "Northern Railway Men's Union", hi: "उत्तर रेलवे मेन्स यूनियन" },
  "org.short": { en: "NRMU", hi: "एन.आर.एम.यू." },
  "org.tagline": { en: "For the Railwaymen of India", hi: "भारत के रेलकर्मियों के लिए" },
  "org.city": { en: "New Delhi", hi: "नई दिल्ली" },
  "hero.kicker": { en: "Northern Railway Men's Union · New Delhi", hi: "उत्तर रेलवे मेन्स यूनियन · नई दिल्ली" },
  "hero.title_a": { en: "For the Railwaymen", hi: "भारत के" },
  "hero.title_b": { en: "of India.", hi: "रेलकर्मियों के लिए।" },
  "hero.sub": {
    en: "Every Railway Board order, circular and union update that matters to you — in one place, searchable, in Hindi and English.",
    hi: "रेलवे बोर्ड के हर आदेश, परिपत्र और यूनियन की हर सूचना — एक ही जगह, खोजने योग्य, हिंदी और अंग्रेज़ी में।",
  },
  "hero.search_placeholder": {
    en: "Search orders, circulars, DOPT, pay commission, pension…",
    hi: "आदेश, परिपत्र, DOPT, वेतन आयोग, पेंशन खोजें…",
  },
  "board.title": { en: "Latest Orders", hi: "नवीनतम आदेश" },
  "board.sub": { en: "Live from the NRMU archive", hi: "एन.आर.एम.यू. संग्रह से सीधे" },
  "home.latest_title": { en: "Latest Orders & Updates", hi: "नवीनतम आदेश एवं सूचनाएँ" },
  "home.latest_sub": { en: "Fresh from Railway Board, DOPT, Ministry of Finance and AIRF.", hi: "रेलवे बोर्ड, DOPT, वित्त मंत्रालय और AIRF से ताज़ा।" },
  "home.services_title": { en: "Find what you need", hi: "अपनी ज़रूरत की जानकारी पाएँ" },
  "home.services_sub": { en: "The most-used sections, one tap away.", hi: "सबसे ज़्यादा इस्तेमाल होने वाले अनुभाग, बस एक टैप दूर।" },
  "home.divisions_title": { en: "Our Divisions", hi: "हमारे मंडल" },
  "home.divisions_sub": { en: "NRMU stands in every division of Northern Railway.", hi: "उत्तर रेलवे के हर मंडल में एन.आर.एम.यू. आपके साथ है।" },
  "home.leaders_title": { en: "Leadership", hi: "नेतृत्व" },
  "home.leaders_sub": { en: "Central office bearers of the union.", hi: "यूनियन के केंद्रीय पदाधिकारी।" },
  "home.cta_title": { en: "Stronger together.", hi: "एकजुट, तो मज़बूत।" },
  "home.cta_text": {
    en: "Become a member, raise your concern, stay informed — NRMU is your union.",
    hi: "सदस्य बनें, अपनी बात रखें, जानकारी से जुड़े रहें — एन.आर.एम.यू. आपकी अपनी यूनियन है।",
  },
  "cta.join": { en: "Join NRMU", hi: "सदस्य बनें" },
  "stats.divisions": { en: "Divisions", hi: "मंडल" },
  "stats.branches": { en: "Branches", hi: "शाखाएँ" },
  "stats.archive": { en: "Orders & updates archived", hi: "संग्रहीत आदेश एवं सूचनाएँ" },
  "stats.since": { en: "Archive since", hi: "संग्रह का आरंभ" },
  "footer.about": {
    en: "Northern Railway Men's Union is a trade union of railway employees, affiliated to the All India Railwaymen's Federation (AIRF).",
    hi: "उत्तर रेलवे मेन्स यूनियन रेलवे कर्मचारियों की ट्रेड यूनियन है, जो अखिल भारतीय रेलवे कर्मचारी महासंघ (AIRF) से संबद्ध है।",
  },
  "footer.address": { en: "New Delhi, India", hi: "नई दिल्ली, भारत" },
  "footer.airf_label": { en: "AIRF — airfindia.org", hi: "AIRF — airfindia.org" },
  "footer.airf_url": { en: "https://www.airfindia.org", hi: "https://www.airfindia.org" },
  "footer.explore": { en: "Explore", hi: "देखें" },
  "footer.contact": { en: "Contact", hi: "संपर्क" },
  "footer.rights": { en: "All rights reserved.", hi: "सर्वाधिकार सुरक्षित।" },
  "site.domain": { en: "nrmu.net", hi: "nrmu.net" },
  "orders.sub": { en: "Railway Board orders, DOPT circulars, pay commission and union letters — search the full archive.", hi: "रेलवे बोर्ड के आदेश, DOPT परिपत्र, वेतन आयोग और यूनियन के पत्र — पूरे संग्रह में खोजें।" },
  "officials.sub": { en: "The central office bearers, divisional presidents and divisional secretaries of the union.", hi: "यूनियन के केंद्रीय पदाधिकारी, मंडल अध्यक्ष और मंडल सचिव।" },
  "divisions.sub": { en: "NRMU is organised in divisions across Northern Railway, each with its own branches and leaders.", hi: "एन.आर.एम.यू. उत्तर रेलवे के मंडलों में संगठित है, हर मंडल की अपनी शाखाएँ और नेतृत्व है।" },
  "women.sub": { en: "Zonal and divisional women committees of NRMU.", hi: "एन.आर.एम.यू. की क्षेत्रीय और मंडलीय महिला समितियाँ।" },
  "youth.sub": { en: "Programmes, conventions and activities of the youth wing.", hi: "युवा प्रकोष्ठ के कार्यक्रम, सम्मेलन और गतिविधियाँ।" },
  "gallery.sub": { en: "Photographs from rallies, meetings, branches and women wing events.", hi: "रैलियों, बैठकों, शाखाओं और महिला प्रकोष्ठ के कार्यक्रमों की तस्वीरें।" },
  "join.title": { en: "Join NRMU", hi: "एन.आर.एम.यू. से जुड़ें" },
  "join.sub": { en: "Share your details and a union representative from your division will contact you.", hi: "अपनी जानकारी दें, आपके मंडल का यूनियन प्रतिनिधि आपसे संपर्क करेगा।" },
  "officials.group.central": { en: "Central Office Bearers", hi: "केंद्रीय पदाधिकारी" },
  "officials.group.division_president": { en: "Divisional Presidents", hi: "मंडल अध्यक्ष" },
  "officials.group.division_secretary": { en: "Divisional Secretaries", hi: "मंडल सचिव" },
  "division.secretary_label": { en: "Divisional Secretary", hi: "मंडल सचिव" },
  "division.president_label": { en: "Divisional President", hi: "मंडल अध्यक्ष" },
  "women.pages_title": { en: "Committees", hi: "समितियाँ" },
  "women.posts_title": { en: "Activities & Events", hi: "गतिविधियाँ एवं कार्यक्रम" },
};

const NAV: { area: string; en: string; hi: string; href: string }[] = [
  { area: "header", en: "Home", hi: "मुख्य पृष्ठ", href: "" },
  { area: "header", en: "Orders & Circulars", hi: "आदेश एवं परिपत्र", href: "/orders" },
  { area: "header", en: "Office Bearers", hi: "पदाधिकारी", href: "/officials" },
  { area: "header", en: "Divisions", hi: "मंडल", href: "/divisions" },
  { area: "header", en: "Women Wing", hi: "महिला प्रकोष्ठ", href: "/women" },
  { area: "header", en: "Youth NRMU", hi: "युवा एन.आर.एम.यू.", href: "/youth" },
  { area: "header", en: "Gallery", hi: "चित्र दीर्घा", href: "/gallery" },
  { area: "footer", en: "Orders & Circulars", hi: "आदेश एवं परिपत्र", href: "/orders" },
  { area: "footer", en: "Office Bearers", hi: "पदाधिकारी", href: "/officials" },
  { area: "footer", en: "Divisions", hi: "मंडल", href: "/divisions" },
  { area: "footer", en: "Women Wing", hi: "महिला प्रकोष्ठ", href: "/women" },
  { area: "footer", en: "Youth NRMU", hi: "युवा एन.आर.एम.यू.", href: "/youth" },
  { area: "footer", en: "Gallery", hi: "चित्र दीर्घा", href: "/gallery" },
];

const QUICK: { en: string; hi: string; cat: string; icon: string }[] = [
  { en: "Railway Board Orders", hi: "रेलवे बोर्ड आदेश", cat: "railway-board-orders", icon: "doc" },
  { en: "Pay Commission", hi: "वेतन आयोग", cat: "pay-commission", icon: "rupee" },
  { en: "Pension & NPS", hi: "पेंशन एवं एन.पी.एस.", cat: "new-pension-scheme", icon: "shield" },
  { en: "DOPT & Finance", hi: "DOPT एवं वित्त", cat: "other-ministeries", icon: "building" },
  { en: "Negotiating Forums", hi: "वार्ता मंच (NC-JCM)", cat: "negotiating-forums", icon: "people" },
  { en: "AIRF Letters", hi: "AIRF पत्र", cat: "airf", icon: "mail" },
];

async function seedConfig() {
  const ui = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "ui-strings.json"), "utf8")) as Record<string, { en: string; hi: string | null }>;
  const config: Record<string, Pair> = {
    "config.women.category": { en: "women-wing", hi: "women-wing" },
    "config.women.page_pattern": { en: "women", hi: "women" },
    "config.youth.category": { en: "youth-nrmu", hi: "youth-nrmu" },
  };
  const all = [
    ...Object.entries(SETTINGS).map(([key, v]) => ({ key, valueEn: v.en, valueHi: v.hi, group: key.split(".")[0] })),
    ...Object.entries(ui).map(([k, v]) => ({ key: `ui.${k}`, valueEn: v.en, valueHi: v.hi, group: "ui" })),
    ...Object.entries(config).map(([key, v]) => ({ key, valueEn: v.en, valueHi: v.hi, group: "config" })),
  ];
  // Existing values (edited in the admin panel) win over these defaults.
  for (const part of chunk(all, 100)) await db.insert(schema.siteSettings).values(part).onConflictDoNothing();
  const [{ n: navCount }] = (await db.execute(sql`select count(*)::int as n from nav_items`)).rows as { n: number }[];
  if (!Number(navCount)) {
    await db.insert(schema.navItems).values(NAV.map((n, i) => ({ area: n.area, labelEn: n.en, labelHi: n.hi, href: n.href, sort: i })));
    await db.insert(schema.quickLinks).values(QUICK.map((q, i) => ({ labelEn: q.en, labelHi: q.hi, href: `/orders?cat=${q.cat}`, icon: q.icon, sort: i })));
    await db.insert(schema.searchChips).values(["DA", "MACP", "NPS", "7th CPC", "HRMS", "LDCE"].map((term, sort) => ({ term, sort })));
  }
  console.log("settings", Object.keys(SETTINGS).length, "nav", NAV.length, "quick links", QUICK.length);
}

/** Defaults for grievances, events and extra page text. Safe to run any time: it only adds what is missing. */
async function ensureFeatureDefaults() {
  const extra = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "extra-settings.json"), "utf8")) as Record<string, { en: string; hi: string; group: string }>;
  const ui = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "ui-strings.json"), "utf8")) as Record<string, { en: string; hi: string | null }>;
  const feat = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "features.json"), "utf8")) as {
    nav: { area: string; en: string; hi: string; href: string }[];
    quick: { en: string; hi: string; href: string; icon: string }[];
    grievanceTypes: [string, string][];
  };
  const settings = [
    ...Object.entries(extra).map(([key, v]) => ({ key, valueEn: v.en, valueHi: v.hi, group: v.group })),
    ...Object.entries(ui).map(([k, v]) => ({ key: `ui.${k}`, valueEn: v.en, valueHi: v.hi, group: "ui" })),
  ];
  for (const part of chunk(settings, 100)) await db.insert(schema.siteSettings).values(part).onConflictDoNothing();

  for (const n of feat.nav) {
    const [row] = (await db.execute(sql`select count(*)::int as n from nav_items where area = ${n.area} and href = ${n.href}`)).rows as { n: number }[];
    if (!Number(row.n)) {
      const [m] = (await db.execute(sql`select coalesce(max(sort), 0) + 1 as m from nav_items where area = ${n.area}`)).rows as { m: number }[];
      await db.insert(schema.navItems).values({ area: n.area, labelEn: n.en, labelHi: n.hi, href: n.href, sort: Number(m.m) });
    }
  }
  for (const q of feat.quick) {
    const [row] = (await db.execute(sql`select count(*)::int as n from quick_links where href = ${q.href}`)).rows as { n: number }[];
    if (!Number(row.n)) {
      const [m] = (await db.execute(sql`select coalesce(max(sort), 0) + 1 as m from quick_links`)).rows as { m: number }[];
      await db.insert(schema.quickLinks).values({ labelEn: q.en, labelHi: q.hi, href: q.href, icon: q.icon, sort: Number(m.m) });
    }
  }
  const [{ n: typeCount }] = (await db.execute(sql`select count(*)::int as n from grievance_types`)).rows as { n: number }[];
  if (!Number(typeCount)) {
    await db.insert(schema.grievanceTypes).values(feat.grievanceTypes.map(([en, hi], i) => ({ nameEn: en, nameHi: hi, sort: i })));
  }
  console.log("feature defaults ensured");
}

async function main() {
  if (process.argv.includes("--config-only")) {
    await ensureFeatureDefaults();
    return;
  }
  console.log("Resetting content tables…");
  await reset();
  await seedContent();
  const divIds = await seedDivisions();
  await seedOfficials(divIds);
  await seedConfig();
  await ensureFeatureDefaults();
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
