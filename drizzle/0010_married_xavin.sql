CREATE TABLE "meeting_invitees" (
	"id" serial PRIMARY KEY NOT NULL,
	"meeting_id" integer NOT NULL,
	"office_bearer_id" integer,
	"name" text NOT NULL,
	"designation" text,
	"mobile" text,
	"email" text,
	"rsvp" text DEFAULT 'pending' NOT NULL,
	"attended" boolean DEFAULT false NOT NULL,
	"joined_at" timestamp with time zone,
	"left_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meeting_reminders" (
	"id" serial PRIMARY KEY NOT NULL,
	"meeting_id" integer NOT NULL,
	"minutes_before" integer NOT NULL,
	"sent_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "meeting_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"name_en" text NOT NULL,
	"name_hi" text,
	"sort" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meetings" (
	"id" serial PRIMARY KEY NOT NULL,
	"title_en" text NOT NULL,
	"title_hi" text,
	"type_id" integer,
	"division_id" integer,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"mode" text DEFAULT 'online' NOT NULL,
	"venue_en" text,
	"venue_hi" text,
	"agenda_en" text,
	"agenda_hi" text,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"recording_on" boolean DEFAULT true NOT NULL,
	"room_name" text,
	"recording_url" text,
	"minutes_url" text,
	"minutes_text" text,
	"notes" text,
	"created_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "meeting_invitees" ADD CONSTRAINT "meeting_invitees_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_invitees" ADD CONSTRAINT "meeting_invitees_office_bearer_id_office_bearers_id_fk" FOREIGN KEY ("office_bearer_id") REFERENCES "public"."office_bearers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_reminders" ADD CONSTRAINT "meeting_reminders_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_type_id_meeting_types_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."meeting_types"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_created_by_admin_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "meeting_invitees_meeting_idx" ON "meeting_invitees" USING btree ("meeting_id");--> statement-breakpoint
CREATE UNIQUE INDEX "meeting_reminders_unique_idx" ON "meeting_reminders" USING btree ("meeting_id","minutes_before");--> statement-breakpoint
CREATE INDEX "meetings_start_idx" ON "meetings" USING btree ("starts_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "meetings_status_idx" ON "meetings" USING btree ("status","starts_at");