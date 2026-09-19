CREATE TABLE "blocked_periods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date NOT NULL,
	"period" "period",
	"reason" text,
	"blocked_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "blocked_periods" ADD CONSTRAINT "blocked_periods_blocked_by_admins_id_fk" FOREIGN KEY ("blocked_by") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;