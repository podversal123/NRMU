CREATE TABLE "gallery_photos" (
	"id" serial PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"caption_en" text DEFAULT '' NOT NULL,
	"caption_hi" text,
	"taken_on" date,
	"featured" boolean DEFAULT false NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "gallery_photos_idx" ON "gallery_photos" USING btree ("active","featured","taken_on" DESC NULLS LAST);