import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  customType,
  date,
  index,
  integer,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
  boolean,
} from "drizzle-orm/pg-core";

const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});

/* ------------------------------ Content ------------------------------ */

export const categories = pgTable(
  "categories",
  {
    id: integer("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    parentId: integer("parent_id"),
    nameEn: text("name_en").notNull(),
    nameHi: text("name_hi"),
    hidden: boolean("hidden").notNull().default(false),
    sort: integer("sort").notNull().default(0),
  },
  (t) => [index("categories_parent_idx").on(t.parentId)],
);

export const posts = pgTable(
  "posts",
  {
    id: integer("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    titleEn: text("title_en").notNull(),
    titleHi: text("title_hi"),
    excerpt: text("excerpt").notNull().default(""),
    contentHtml: text("content_html").notNull().default(""),
    bodyText: text("body_text").notNull().default(""),
    publishedAt: date("published_at").notNull(),
    thumbUrl: text("thumb_url"),
    status: text("status").notNull().default("published"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    search: tsvector("search").generatedAlwaysAs(
      sql`setweight(to_tsvector('simple', coalesce(title_en, '')), 'A') || setweight(to_tsvector('simple', coalesce(excerpt, '')), 'B') || setweight(to_tsvector('simple', coalesce(body_text, '')), 'C')`,
    ),
  },
  (t) => [
    index("posts_published_idx").on(t.status, t.publishedAt.desc(), t.id.desc()),
    index("posts_search_idx").using("gin", t.search),
  ],
);

export const postCategories = pgTable(
  "post_categories",
  {
    postId: integer("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.postId, t.categoryId] }), index("post_categories_cat_idx").on(t.categoryId, t.postId)],
);

/** Attachments of a post (PDF, Word, Excel, image). One row per file. */
export const postFiles = pgTable(
  "post_files",
  {
    id: serial("id").primaryKey(),
    postId: integer("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    name: text("name"),
    kind: text("kind").notNull().default("file"),
    sort: integer("sort").notNull().default(0),
  },
  (t) => [index("post_files_post_idx").on(t.postId, t.sort)],
);

export const pages = pgTable("pages", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  titleEn: text("title_en").notNull(),
  titleHi: text("title_hi"),
  contentHtml: text("content_html").notNull().default(""),
  contentHtmlHi: text("content_html_hi"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* --------------------------- Organisation ---------------------------- */

export const divisions = pgTable("divisions", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  nameEn: text("name_en").notNull(),
  nameHi: text("name_hi"),
  descriptionEn: text("description_en"),
  descriptionHi: text("description_hi"),
  /** Address of this division on the old WordPress website, used for redirects. */
  legacySlug: text("legacy_slug"),
  sort: integer("sort").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

export const branches = pgTable(
  "branches",
  {
    id: serial("id").primaryKey(),
    divisionId: integer("division_id")
      .notNull()
      .references(() => divisions.id, { onDelete: "cascade" }),
    nameEn: text("name_en").notNull(),
    nameHi: text("name_hi"),
    members: integer("members"),
    sort: integer("sort").notNull().default(0),
  },
  (t) => [index("branches_division_idx").on(t.divisionId)],
);

/** Titles held by office bearers. scope: central | division_president | division_secretary | branch_secretary */
export const designations = pgTable("designations", {
  id: serial("id").primaryKey(),
  scope: text("scope").notNull(),
  nameEn: text("name_en").notNull(),
  nameHi: text("name_hi"),
  sort: integer("sort").notNull().default(0),
});

/** scope: central | division_president | division_secretary | branch_secretary */
export const officeBearers = pgTable(
  "office_bearers",
  {
    id: serial("id").primaryKey(),
    scope: text("scope").notNull(),
    divisionId: integer("division_id").references(() => divisions.id, { onDelete: "set null" }),
    nameEn: text("name_en").notNull(),
    nameHi: text("name_hi"),
    designationId: integer("designation_id").references(() => designations.id, { onDelete: "restrict" }),
    branchId: integer("branch_id").references(() => branches.id, { onDelete: "set null" }),
    /** Free-text place of work as printed on the old site (e.g. "DLI C&W"), shown next to the title. */
    placeLabel: text("place_label"),
    addressEn: text("address_en"),
    phone: text("phone"),
    photoUrl: text("photo_url"),
    featured: boolean("featured").notNull().default(false),
    sort: integer("sort").notNull().default(0),
    active: boolean("active").notNull().default(true),
  },
  (t) => [index("office_bearers_scope_idx").on(t.scope, t.divisionId, t.sort)],
);

/* ----------------------------- Site config --------------------------- */

export const siteSettings = pgTable("site_settings", {
  key: text("key").primaryKey(),
  valueEn: text("value_en").notNull().default(""),
  valueHi: text("value_hi"),
  group: text("group").notNull().default("general"),
});

export const navItems = pgTable("nav_items", {
  id: serial("id").primaryKey(),
  area: text("area").notNull(), // header | footer | links (important links, may be external) | policy
  /** A menu item with a parent appears in that item's dropdown. */
  parentId: integer("parent_id").references((): AnyPgColumn => navItems.id, { onDelete: "cascade" }),
  labelEn: text("label_en").notNull(),
  labelHi: text("label_hi"),
  href: text("href").notNull(), // path without language prefix
  sort: integer("sort").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

export const searchChips = pgTable("search_chips", {
  id: serial("id").primaryKey(),
  term: text("term").notNull(),
  sort: integer("sort").notNull().default(0),
});

/* ------------------------------- Admin ------------------------------- */

/** role: super_admin | editor | division_admin */
export const adminUsers = pgTable(
  "admin_users",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: text("role").notNull().default("editor"),
    divisionId: integer("division_id").references(() => divisions.id, { onDelete: "set null" }),
    active: boolean("active").notNull().default(true),
    failedAttempts: integer("failed_attempts").notNull().default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("admin_users_email_idx").on(sql`lower(${t.email})`)],
);

export type Post = typeof posts.$inferSelect;
export type Category = typeof categories.$inferSelect;

/** Membership interest forms submitted from the public "Join NRMU" page. status: new | contacted | closed */
export const joinRequests = pgTable(
  "join_requests",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    mobile: text("mobile").notNull(),
    email: text("email"),
    divisionId: integer("division_id").references(() => divisions.id, { onDelete: "set null" }),
    designation: text("designation"),
    employeeId: text("employee_id"),
    message: text("message"),
    status: text("status").notNull().default("new"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("join_requests_status_idx").on(t.status, t.createdAt.desc())],
);

/** Photographs shown in the public gallery and on the home page. Uploaded from the admin panel. */
export const galleryPhotos = pgTable(
  "gallery_photos",
  {
    id: serial("id").primaryKey(),
    url: text("url").notNull(),
    captionEn: text("caption_en").notNull().default(""),
    captionHi: text("caption_hi"),
    takenOn: date("taken_on"),
    featured: boolean("featured").notNull().default(false),
    sort: integer("sort").notNull().default(0),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("gallery_photos_idx").on(t.active, t.featured, t.takenOn.desc())],
);

/* ------------------------- Events & meetings ------------------------- */

export const events = pgTable(
  "events",
  {
    id: serial("id").primaryKey(),
    titleEn: text("title_en").notNull(),
    titleHi: text("title_hi"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    venueEn: text("venue_en"),
    venueHi: text("venue_hi"),
    descriptionEn: text("description_en"),
    descriptionHi: text("description_hi"),
    divisionId: integer("division_id").references(() => divisions.id, { onDelete: "set null" }),
    agendaUrl: text("agenda_url"),
    minutesUrl: text("minutes_url"),
    published: boolean("published").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("events_start_idx").on(t.published, t.startsAt.desc())],
);

/* ------------------------------ Grievances ----------------------------- */

export const grievanceTypes = pgTable("grievance_types", {
  id: serial("id").primaryKey(),
  nameEn: text("name_en").notNull(),
  nameHi: text("name_hi"),
  sort: integer("sort").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

/**
 * A member's grievance. status: open | in_progress | resolved | closed.
 * level: 1 division, 2 NRMU headquarters, 3 AIRF (see the grievance.level.* settings).
 */
export const grievances = pgTable(
  "grievances",
  {
    id: serial("id").primaryKey(),
    ticket: text("ticket").notNull().unique(),
    name: text("name").notNull(),
    mobile: text("mobile").notNull(),
    email: text("email"),
    employeeId: text("employee_id"),
    divisionId: integer("division_id").references(() => divisions.id, { onDelete: "set null" }),
    typeId: integer("type_id").references(() => grievanceTypes.id, { onDelete: "set null" }),
    subject: text("subject").notNull(),
    details: text("details").notNull(),
    status: text("status").notNull().default("open"),
    level: integer("level").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("grievances_status_idx").on(t.status, t.level, t.updatedAt),
    index("grievances_division_idx").on(t.divisionId, t.status),
    index("grievances_mobile_idx").on(t.mobile),
  ],
);

/** Timeline of a grievance. kind: created | note | status | level | escalated. `public` notes are shown to the member. */
export const grievanceEvents = pgTable(
  "grievance_events",
  {
    id: serial("id").primaryKey(),
    grievanceId: integer("grievance_id")
      .notNull()
      .references(() => grievances.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    /** New status (kind "status") or level number (kinds "level" and "escalated"); wording is rendered from the database labels. */
    value: text("value"),
    message: text("message").notNull().default(""),
    public: boolean("public").notNull().default(true),
    adminId: integer("admin_id").references(() => adminUsers.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("grievance_events_idx").on(t.grievanceId, t.createdAt)],
);

/** Page views per day, for the visitor counter shown in the footer. */
export const visitCounts = pgTable("visit_counts", {
  day: date("day").primaryKey(),
  visits: integer("visits").notNull().default(0),
});
