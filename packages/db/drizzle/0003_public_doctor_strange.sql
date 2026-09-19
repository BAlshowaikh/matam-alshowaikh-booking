CREATE TABLE "hijri_date_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gregorian_date" date NOT NULL,
	"hijri_year" smallint NOT NULL,
	"hijri_month" smallint NOT NULL,
	"hijri_day" smallint NOT NULL,
	"set_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hijri_date_overrides_gregorian_date_unique" UNIQUE("gregorian_date")
);
--> statement-breakpoint
ALTER TABLE "hijri_date_overrides" ADD CONSTRAINT "hijri_date_overrides_set_by_admins_id_fk" FOREIGN KEY ("set_by") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;