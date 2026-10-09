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
    /** The album this photo belongs to; empty for a loose photo. */
    albumId: integer("album_id").references(() => galleryAlbums.id, { onDelete: "set null" }),
    featured: boolean("featured").notNull().default(false),
    sort: integer("sort").notNull().default(0),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("gallery_photos_idx").on(t.active, t.featured, t.takenOn.desc()), index("gallery_photos_album_idx").on(t.albumId)],
);

/** A set of photos from one occasion. Tagged with the division and branch it belongs to so visitors can filter. */
export const galleryAlbums = pgTable(
  "gallery_albums",
  {
    id: serial("id").primaryKey(),
    titleEn: text("title_en").notNull(),
    titleHi: text("title_hi"),
    descriptionEn: text("description_en"),
    descriptionHi: text("description_hi"),
    /** Empty means the whole union. */
    divisionId: integer("division_id").references(() => divisions.id, { onDelete: "set null" }),
    branchId: integer("branch_id").references(() => branches.id, { onDelete: "set null" }),
    heldOn: date("held_on"),
    sort: integer("sort").notNull().default(0),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("gallery_albums_idx").on(t.active, t.heldOn.desc()), index("gallery_albums_division_idx").on(t.divisionId)],
);

/** The committee of a wing (women or youth). A row with no division belongs to the central committee. */
export const committeeMembers = pgTable(
  "committee_members",
  {
    id: serial("id").primaryKey(),
    wing: text("wing").notNull(), // women | youth
    nameEn: text("name_en").notNull(),
    nameHi: text("name_hi"),
    designationEn: text("designation_en"),
    designationHi: text("designation_hi"),
    divisionId: integer("division_id").references(() => divisions.id, { onDelete: "set null" }),
    phone: text("phone"),
    photoUrl: text("photo_url"),
    sort: integer("sort").notNull().default(0),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("committee_members_idx").on(t.wing, t.active, t.sort)],
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

/* ------------------------------- Members ------------------------------- */

/** The field a member works in (commercial, loco, S&T...). Edited as data; a branch name alone cannot say it. */
export const departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  nameEn: text("name_en").notNull(),
  nameHi: text("name_hi"),
  sort: integer("sort").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

/**
 * Union members. Someone registers themselves (status "pending"); a super admin or the division admin of
 * their division approves them ("active"). Only active members can sign in. The password is stored only as a
 * one-way hash. `consent_at` records when they agreed to the privacy terms.
 */
export const members = pgTable(
  "members",
  {
    id: serial("id").primaryKey(),
    /** Given when the membership is approved, e.g. NRMU-000123. */
    membershipNo: text("membership_no"),
    name: text("name").notNull(),
    mobile: text("mobile").notNull(),
    email: text("email"),
    employeeId: text("employee_id"),
    divisionId: integer("division_id").references(() => divisions.id, { onDelete: "set null" }),
    branchId: integer("branch_id").references(() => branches.id, { onDelete: "set null" }),
    departmentId: integer("department_id").references(() => departments.id, { onDelete: "set null" }),
    designation: text("designation"),
    passwordHash: text("password_hash").notNull(),
    /** Set when an admin gives a temporary password: the member must choose their own at the next sign-in. */
    mustChangePassword: boolean("must_change_password").notNull().default(false),
    status: text("status").notNull().default("pending"), // pending | active | suspended | rejected
    consentAt: timestamp("consent_at", { withTimezone: true }).notNull(),
    approvedBy: integer("approved_by").references(() => adminUsers.id, { onDelete: "set null" }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    validUntil: date("valid_until"),
    failedAttempts: integer("failed_attempts").notNull().default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("members_mobile_idx").on(t.mobile),
    uniqueIndex("members_no_idx").on(t.membershipNo),
    index("members_division_idx").on(t.divisionId, t.status),
    index("members_department_idx").on(t.departmentId),
    index("members_status_idx").on(t.status, t.createdAt.desc()),
  ],
);

/* ------------------------------- Meetings ------------------------------ */

/** Kinds of meeting (executive committee, general body, ...). Edited as data, never hard-coded. */
export const meetingTypes = pgTable("meeting_types", {
  id: serial("id").primaryKey(),
  nameEn: text("name_en").notNull(),
  nameHi: text("name_hi"),
  /** True for the kinds that have their own heading on the public Meetings pages. */
  showPublic: boolean("show_public").notNull().default(false),
  sort: integer("sort").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

/**
 * Union meetings, scheduled and recorded by the super admin. Unlike `events` (which is the public
 * calendar), everything here is private: invitees, attendance, recordings and minutes.
 * "Live" is not stored; it follows from the clock (scheduled and between starts_at and ends_at).
 */
export const meetings = pgTable(
  "meetings",
  {
    id: serial("id").primaryKey(),
    titleEn: text("title_en").notNull(),
    titleHi: text("title_hi"),
    typeId: integer("type_id").references(() => meetingTypes.id, { onDelete: "set null" }),
    /** Empty means the whole union. */
    divisionId: integer("division_id").references(() => divisions.id, { onDelete: "set null" }),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    mode: text("mode").notNull().default("online"), // online | in_person | hybrid
    venueEn: text("venue_en"),
    venueHi: text("venue_hi"),
    agendaEn: text("agenda_en"),
    agendaHi: text("agenda_hi"),
    status: text("status").notNull().default("scheduled"), // scheduled | completed | cancelled
    recordingOn: boolean("recording_on").notNull().default(true),
    /** Name and address of the video room at the video provider; set when the room is created. */
    roomName: text("room_name"),
    roomUrl: text("room_url"),
    /** True when the room really was created with recording switched on (the video plan may not allow it). */
    roomRecording: boolean("room_recording").notNull().default(false),
    /** The finished recording at the video provider, and how long it is. Opened through a fresh temporary link each time. */
    recordingId: text("recording_id"),
    recordingSeconds: integer("recording_seconds"),
    /** A link pasted by hand (for example a recording made elsewhere). */
    recordingUrl: text("recording_url"),
    minutesUrl: text("minutes_url"),
    minutesText: text("minutes_text"),
    /** Public meetings show their notice, agenda, resolutions and minutes on the website. Everything else stays private. */
    isPublic: boolean("is_public").notNull().default(false),
    noticeUrl: text("notice_url"),
    resolutionsEn: text("resolutions_en"),
    resolutionsHi: text("resolutions_hi"),
    /** Private notes of the super admin. */
    notes: text("notes"),
    createdBy: integer("created_by").references(() => adminUsers.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("meetings_start_idx").on(t.startsAt.desc()), index("meetings_status_idx").on(t.status, t.startsAt), index("meetings_public_idx").on(t.isPublic, t.typeId, t.startsAt.desc())],
);

/** Who is invited, whether they said yes, and whether they came. */
export const meetingInvitees = pgTable(
  "meeting_invitees",
  {
    id: serial("id").primaryKey(),
    meetingId: integer("meeting_id").notNull().references(() => meetings.id, { onDelete: "cascade" }),
    officeBearerId: integer("office_bearer_id").references(() => officeBearers.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    designation: text("designation"),
    mobile: text("mobile"),
    email: text("email"),
    rsvp: text("rsvp").notNull().default("pending"), // pending | yes | no | maybe
    attended: boolean("attended").notNull().default(false),
    /** Secret in this person's own meeting link. 64 random hex characters, made by the database. */
    joinToken: text("join_token").notNull().default(sql`replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')`),
    joinedAt: timestamp("joined_at", { withTimezone: true }),
    leftAt: timestamp("left_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("meeting_invitees_meeting_idx").on(t.meetingId), uniqueIndex("meeting_invitees_token_idx").on(t.joinToken)],
);

/** One row per reminder due before a meeting ("1 day before", "1 hour before"); sent_at is set when it went out. */
export const meetingReminders = pgTable(
  "meeting_reminders",
  {
    id: serial("id").primaryKey(),
    meetingId: integer("meeting_id").notNull().references(() => meetings.id, { onDelete: "cascade" }),
    minutesBefore: integer("minutes_before").notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("meeting_reminders_unique_idx").on(t.meetingId, t.minutesBefore)],
);

/* ----------------------------- Abuse control --------------------------- */

/** How many times something was done in one time window (see lib/rate-limit.ts). Holds no names or addresses, only hashes. */
export const rateLimits = pgTable(
  "rate_limits",
  {
    key: text("key").notNull(),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    hits: integer("hits").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.key, t.windowStart] }), index("rate_limits_window_idx").on(t.windowStart)],
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
