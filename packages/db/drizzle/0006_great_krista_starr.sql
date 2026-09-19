CREATE TYPE "public"."attendee_gender" AS ENUM('male', 'female');--> statement-breakpoint
CREATE TYPE "public"."booking_place" AS ENUM('old_matam', 'male_hall', 'female_hall', 'male_tent');--> statement-breakpoint
CREATE TYPE "public"."booking_purpose" AS ENUM('fatiha', 'wedding', 'aqd_qiran', 'tathwibat', 'nuthur', 'mawaqeet', 'other');--> statement-breakpoint
ALTER TYPE "public"."period" ADD VALUE 'morning' BEFORE 'afternoon';--> statement-breakpoint
ALTER TYPE "public"."period" ADD VALUE 'all';--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "purpose" "booking_purpose" NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "purpose_other" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "attendee_gender" "attendee_gender" NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "place" "booking_place" NOT NULL;