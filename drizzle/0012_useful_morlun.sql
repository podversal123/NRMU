ALTER TABLE "meetings" ADD COLUMN "room_url" text;--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN "room_recording" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN "recording_id" text;--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN "recording_seconds" integer;