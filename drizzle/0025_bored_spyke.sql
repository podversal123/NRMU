CREATE TABLE "reels" (
	"id" serial PRIMARY KEY NOT NULL,
	"title_en" text NOT NULL,
	"title_hi" text,
	"credit" text,
	"public_id" text NOT NULL,
	"seconds" integer DEFAULT 0 NOT NULL,
	"bytes" integer DEFAULT 0 NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"published" boolean DEFAULT true NOT NULL,
	"created_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"i18n" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reels" ADD CONSTRAINT "reels_created_by_admin_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "reels_public_id_idx" ON "reels" USING btree ("public_id");--> statement-breakpoint
CREATE INDEX "reels_feed_idx" ON "reels" USING btree ("published","sort","created_at" DESC NULLS LAST);