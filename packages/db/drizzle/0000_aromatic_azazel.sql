CREATE TYPE "public"."booking_status" AS ENUM('pending', 'approved', 'rejected', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."period" AS ENUM('afternoon', 'evening');--> statement-breakpoint
CREATE TABLE "admins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admins_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_reference" text NOT NULL,
	"event_date" date NOT NULL,
	"hijri_year" smallint NOT NULL,
	"hijri_month" smallint NOT NULL,
	"hijri_day" smallint NOT NULL,
	"period" "period" NOT NULL,
	"status" "booking_status" DEFAULT 'pending' NOT NULL,
	"requester_name" text NOT NULL,
	"requester_phone" text NOT NULL,
	"note" text,
	"admin_note" text,
	"rejection_reason" text,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_booking_reference_unique" UNIQUE("booking_reference")
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_reviewed_by_admins_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_booking_active_slot" ON "bookings" USING btree ("event_date","period") WHERE "bookings"."status" in ('pending', 'approved');