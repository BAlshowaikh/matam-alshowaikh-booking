CREATE TABLE "booking_periods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"event_date" date NOT NULL,
	"period" "period" NOT NULL,
	"status" "booking_status" NOT NULL
);
--> statement-breakpoint
DROP INDEX "uq_booking_active_slot";--> statement-breakpoint
ALTER TABLE "booking_periods" ADD CONSTRAINT "booking_periods_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- Backfill one row per existing booking's period, expanding "all" into all three
-- specific periods — a whole-day booking is never stored as its own "all" row here.
INSERT INTO "booking_periods" ("booking_id", "event_date", "period", "status")
SELECT "id", "event_date", unnest(
  CASE WHEN "period" = 'all' THEN ARRAY['morning', 'afternoon', 'evening']::"period"[] ELSE ARRAY["period"]::"period"[] END
), "status"
FROM "bookings";--> statement-breakpoint
CREATE UNIQUE INDEX "uq_booking_period_active_slot" ON "booking_periods" USING btree ("event_date","period") WHERE "booking_periods"."status" in ('pending', 'approved');--> statement-breakpoint
ALTER TABLE "bookings" DROP COLUMN "period";