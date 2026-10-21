CREATE TABLE "feed_counts" (
	"target" text NOT NULL,
	"target_id" integer NOT NULL,
	"likes" integer DEFAULT 0 NOT NULL,
	"comments" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "feed_counts_target_target_id_pk" PRIMARY KEY("target","target_id"),
	CONSTRAINT "feed_counts_target_chk" CHECK ("feed_counts"."target" in ('order', 'member'))
);
