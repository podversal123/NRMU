CREATE TABLE "designations" (
	"id" serial PRIMARY KEY NOT NULL,
	"scope" text NOT NULL,
	"name_en" text NOT NULL,
	"name_hi" text,
	"sort" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" serial PRIMARY KEY NOT NULL,
	"title_en" text NOT NULL,
	"title_hi" text,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"venue_en" text,
	"venue_hi" text,
	"description_en" text,
	"description_hi" text,
	"division_id" integer,
	"agenda_url" text,
	"minutes_url" text,
	"published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grievance_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"grievance_id" integer NOT NULL,
	"kind" text NOT NULL,
	"message" text DEFAULT '' NOT NULL,
	"public" boolean DEFAULT true NOT NULL,
	"admin_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grievance_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"name_en" text NOT NULL,
	"name_hi" text,
	"sort" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grievances" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket" text NOT NULL,
	"name" text NOT NULL,
	"mobile" text NOT NULL,
	"email" text,
	"employee_id" text,
	"division_id" integer,
	"type_id" integer,
	"subject" text NOT NULL,
	"details" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "grievances_ticket_unique" UNIQUE("ticket")
);
--> statement-breakpoint
CREATE TABLE "post_files" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"url" text NOT NULL,
	"name" text,
	"kind" text DEFAULT 'file' NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "office_bearers" ALTER COLUMN "designation_en" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "hidden" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "divisions" ADD COLUMN "legacy_slug" text;--> statement-breakpoint
ALTER TABLE "office_bearers" ADD COLUMN "designation_id" integer;--> statement-breakpoint
ALTER TABLE "office_bearers" ADD COLUMN "branch_id" integer;--> statement-breakpoint
ALTER TABLE "office_bearers" ADD COLUMN "place_label" text;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grievance_events" ADD CONSTRAINT "grievance_events_grievance_id_grievances_id_fk" FOREIGN KEY ("grievance_id") REFERENCES "public"."grievances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grievance_events" ADD CONSTRAINT "grievance_events_admin_id_admin_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grievances" ADD CONSTRAINT "grievances_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grievances" ADD CONSTRAINT "grievances_type_id_grievance_types_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."grievance_types"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_files" ADD CONSTRAINT "post_files_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "events_start_idx" ON "events" USING btree ("published","starts_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "grievance_events_idx" ON "grievance_events" USING btree ("grievance_id","created_at");--> statement-breakpoint
CREATE INDEX "grievances_status_idx" ON "grievances" USING btree ("status","level","updated_at");--> statement-breakpoint
CREATE INDEX "grievances_division_idx" ON "grievances" USING btree ("division_id","status");--> statement-breakpoint
CREATE INDEX "grievances_mobile_idx" ON "grievances" USING btree ("mobile");--> statement-breakpoint
CREATE INDEX "post_files_post_idx" ON "post_files" USING btree ("post_id","sort");--> statement-breakpoint
ALTER TABLE "office_bearers" ADD CONSTRAINT "office_bearers_designation_id_designations_id_fk" FOREIGN KEY ("designation_id") REFERENCES "public"."designations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "office_bearers" ADD CONSTRAINT "office_bearers_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;