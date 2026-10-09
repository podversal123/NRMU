CREATE TABLE "committee_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"wing" text NOT NULL,
	"name_en" text NOT NULL,
	"name_hi" text,
	"designation_en" text,
	"designation_hi" text,
	"division_id" integer,
	"phone" text,
	"photo_url" text,
	"sort" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gallery_albums" (
	"id" serial PRIMARY KEY NOT NULL,
	"title_en" text NOT NULL,
	"title_hi" text,
	"description_en" text,
	"description_hi" text,
	"division_id" integer,
	"branch_id" integer,
	"held_on" date,
	"sort" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "gallery_photos" ADD COLUMN "album_id" integer;--> statement-breakpoint
ALTER TABLE "meeting_types" ADD COLUMN "show_public" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN "is_public" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN "notice_url" text;--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN "resolutions_en" text;--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN "resolutions_hi" text;--> statement-breakpoint
ALTER TABLE "committee_members" ADD CONSTRAINT "committee_members_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gallery_albums" ADD CONSTRAINT "gallery_albums_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gallery_albums" ADD CONSTRAINT "gallery_albums_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "committee_members_idx" ON "committee_members" USING btree ("wing","active","sort");--> statement-breakpoint
CREATE INDEX "gallery_albums_idx" ON "gallery_albums" USING btree ("active","held_on" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "gallery_albums_division_idx" ON "gallery_albums" USING btree ("division_id");--> statement-breakpoint
ALTER TABLE "gallery_photos" ADD CONSTRAINT "gallery_photos_album_id_gallery_albums_id_fk" FOREIGN KEY ("album_id") REFERENCES "public"."gallery_albums"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "gallery_photos_album_idx" ON "gallery_photos" USING btree ("album_id");--> statement-breakpoint
CREATE INDEX "meetings_public_idx" ON "meetings" USING btree ("is_public","type_id","starts_at" DESC NULLS LAST);