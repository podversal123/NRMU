CREATE TABLE "feed_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"target" text NOT NULL,
	"target_id" integer NOT NULL,
	"member_id" integer NOT NULL,
	"kind" text DEFAULT 'comment' NOT NULL,
	"body" text NOT NULL,
	"status" text DEFAULT 'visible' NOT NULL,
	"hidden_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feed_likes" (
	"target" text NOT NULL,
	"target_id" integer NOT NULL,
	"member_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "feed_likes_target_target_id_member_id_pk" PRIMARY KEY("target","target_id","member_id")
);
--> statement-breakpoint
CREATE TABLE "feed_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"target" text NOT NULL,
	"target_id" integer NOT NULL,
	"member_id" integer NOT NULL,
	"reason" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"resolved_by" integer,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feed_topics" (
	"id" serial PRIMARY KEY NOT NULL,
	"name_en" text NOT NULL,
	"name_hi" text,
	"sort" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"i18n" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member_post_media" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"url" text NOT NULL,
	"kind" text NOT NULL,
	"name" text,
	"sort" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"member_id" integer NOT NULL,
	"topic_id" integer,
	"body" text NOT NULL,
	"anonymous" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"review_note" text,
	"reviewed_by" integer,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "feed_comments" ADD CONSTRAINT "feed_comments_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feed_comments" ADD CONSTRAINT "feed_comments_hidden_by_admin_users_id_fk" FOREIGN KEY ("hidden_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feed_likes" ADD CONSTRAINT "feed_likes_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feed_reports" ADD CONSTRAINT "feed_reports_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feed_reports" ADD CONSTRAINT "feed_reports_resolved_by_admin_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_post_media" ADD CONSTRAINT "member_post_media_post_id_member_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."member_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_posts" ADD CONSTRAINT "member_posts_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_posts" ADD CONSTRAINT "member_posts_topic_id_feed_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."feed_topics"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_posts" ADD CONSTRAINT "member_posts_reviewed_by_admin_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "feed_comments_target_idx" ON "feed_comments" USING btree ("target","target_id","created_at");--> statement-breakpoint
CREATE INDEX "feed_comments_recent_idx" ON "feed_comments" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "feed_likes_member_idx" ON "feed_likes" USING btree ("member_id");--> statement-breakpoint
CREATE UNIQUE INDEX "feed_reports_once_idx" ON "feed_reports" USING btree ("target","target_id","member_id");--> statement-breakpoint
CREATE INDEX "feed_reports_status_idx" ON "feed_reports" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "member_post_media_post_idx" ON "member_post_media" USING btree ("post_id","sort");--> statement-breakpoint
CREATE INDEX "member_posts_feed_idx" ON "member_posts" USING btree ("status","published_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "member_posts_member_idx" ON "member_posts" USING btree ("member_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "member_posts_queue_idx" ON "member_posts" USING btree ("status","created_at");