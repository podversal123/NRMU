CREATE TABLE "poll_options" (
	"id" serial PRIMARY KEY NOT NULL,
	"poll_id" integer NOT NULL,
	"label_en" text NOT NULL,
	"label_hi" text,
	"sort" integer DEFAULT 0 NOT NULL,
	"votes" integer DEFAULT 0 NOT NULL,
	"i18n" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "poll_voters" (
	"poll_id" integer NOT NULL,
	"member_id" integer NOT NULL,
	"voted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "poll_voters_poll_id_member_id_pk" PRIMARY KEY("poll_id","member_id")
);
--> statement-breakpoint
CREATE TABLE "polls" (
	"id" serial PRIMARY KEY NOT NULL,
	"title_en" text NOT NULL,
	"title_hi" text,
	"description_en" text,
	"description_hi" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"max_choices" integer DEFAULT 1 NOT NULL,
	"show_results" text DEFAULT 'after_vote' NOT NULL,
	"division_id" integer,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"voters" integer DEFAULT 0 NOT NULL,
	"created_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"i18n" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "polls_status_chk" CHECK ("polls"."status" in ('draft', 'open', 'closed')),
	CONSTRAINT "polls_show_chk" CHECK ("polls"."show_results" in ('after_vote', 'after_close', 'admin_only')),
	CONSTRAINT "polls_choices_chk" CHECK ("polls"."max_choices" between 1 and 10)
);
--> statement-breakpoint
ALTER TABLE "poll_options" ADD CONSTRAINT "poll_options_poll_id_polls_id_fk" FOREIGN KEY ("poll_id") REFERENCES "public"."polls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poll_voters" ADD CONSTRAINT "poll_voters_poll_id_polls_id_fk" FOREIGN KEY ("poll_id") REFERENCES "public"."polls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poll_voters" ADD CONSTRAINT "poll_voters_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "polls" ADD CONSTRAINT "polls_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "polls" ADD CONSTRAINT "polls_created_by_admin_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "poll_options_poll_idx" ON "poll_options" USING btree ("poll_id","sort");--> statement-breakpoint
CREATE INDEX "poll_voters_member_idx" ON "poll_voters" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "polls_status_idx" ON "polls" USING btree ("status","created_at" DESC NULLS LAST);