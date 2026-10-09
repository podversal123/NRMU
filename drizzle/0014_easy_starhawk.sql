CREATE TABLE "departments" (
	"id" serial PRIMARY KEY NOT NULL,
	"name_en" text NOT NULL,
	"name_hi" text,
	"sort" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" serial PRIMARY KEY NOT NULL,
	"membership_no" text,
	"name" text NOT NULL,
	"mobile" text NOT NULL,
	"email" text,
	"employee_id" text,
	"division_id" integer,
	"branch_id" integer,
	"department_id" integer,
	"designation" text,
	"password_hash" text NOT NULL,
	"must_change_password" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"consent_at" timestamp with time zone NOT NULL,
	"approved_by" integer,
	"approved_at" timestamp with time zone,
	"valid_until" date,
	"failed_attempts" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_approved_by_admin_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "members_mobile_idx" ON "members" USING btree ("mobile");--> statement-breakpoint
CREATE UNIQUE INDEX "members_no_idx" ON "members" USING btree ("membership_no");--> statement-breakpoint
CREATE INDEX "members_division_idx" ON "members" USING btree ("division_id","status");--> statement-breakpoint
CREATE INDEX "members_department_idx" ON "members" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "members_status_idx" ON "members" USING btree ("status","created_at" DESC NULLS LAST);