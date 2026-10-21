ALTER TABLE "feed_comments" ADD CONSTRAINT "feed_comments_target_chk" CHECK ("feed_comments"."target" in ('order', 'member'));--> statement-breakpoint
ALTER TABLE "feed_comments" ADD CONSTRAINT "feed_comments_kind_chk" CHECK ("feed_comments"."kind" in ('comment', 'suggestion'));--> statement-breakpoint
ALTER TABLE "feed_comments" ADD CONSTRAINT "feed_comments_status_chk" CHECK ("feed_comments"."status" in ('visible', 'hidden'));--> statement-breakpoint
ALTER TABLE "feed_likes" ADD CONSTRAINT "feed_likes_target_chk" CHECK ("feed_likes"."target" in ('order', 'member'));--> statement-breakpoint
ALTER TABLE "feed_reports" ADD CONSTRAINT "feed_reports_target_chk" CHECK ("feed_reports"."target" in ('order', 'member', 'comment'));--> statement-breakpoint
ALTER TABLE "feed_reports" ADD CONSTRAINT "feed_reports_status_chk" CHECK ("feed_reports"."status" in ('open', 'dismissed', 'actioned'));--> statement-breakpoint
ALTER TABLE "member_post_media" ADD CONSTRAINT "member_post_media_kind_chk" CHECK ("member_post_media"."kind" in ('image', 'video', 'file'));--> statement-breakpoint
ALTER TABLE "member_posts" ADD CONSTRAINT "member_posts_status_chk" CHECK ("member_posts"."status" in ('pending', 'approved', 'rejected', 'removed'));