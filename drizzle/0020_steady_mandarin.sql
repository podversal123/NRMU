CREATE TABLE "feed_guest_likes" (
	"target" text NOT NULL,
	"target_id" integer NOT NULL,
	"visitor" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "feed_guest_likes_target_target_id_visitor_pk" PRIMARY KEY("target","target_id","visitor"),
	CONSTRAINT "feed_guest_likes_target_chk" CHECK ("feed_guest_likes"."target" in ('order', 'member'))
);
