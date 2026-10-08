CREATE TABLE "visit_counts" (
	"day" date PRIMARY KEY NOT NULL,
	"visits" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "nav_items" ADD COLUMN "parent_id" integer;