CREATE TYPE "public"."attendee_gender" AS ENUM('male', 'female');--> statement-breakpoint
CREATE TYPE "public"."booking_place" AS ENUM('old_matam', 'male_hall', 'female_hall', 'male_tent');--> statement-breakpoint
CREATE TYPE "public"."booking_purpose" AS ENUM('fatiha', 'wedding', 'aqd_qiran', 'tathwibat', 'nuthur', 'mawaqeet', 'other');--> statement-breakpoint
-- Rebuilt instead of two ALTER TYPE ... ADD VALUE statements: Postgres refuses to use an
-- enum value in the same transaction that ADD VALUE introduced it, and drizzle applies all
-- pending migrations in one transaction. On a fresh database that made 0009's backfill
-- (which reads 'all' and 'morning') fail. Values of a type CREATEd inside the transaction
-- carry no such restriction. Resulting value set and order are unchanged.
ALTER TYPE "public"."period" RENAME TO "period_old";--> statement-breakpoint
CREATE TYPE "public"."period" AS ENUM('morning', 'afternoon', 'evening', 'all');--> statement-breakpoint
ALTER TABLE "bookings" ALTER COLUMN "period" TYPE "public"."period" USING "period"::text::"public"."period";--> statement-breakpoint
ALTER TABLE "blocked_periods" ALTER COLUMN "period" TYPE "public"."period" USING "period"::text::"public"."period";--> statement-breakpoint
DROP TYPE "public"."period_old";--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "purpose" "booking_purpose" NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "purpose_other" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "attendee_gender" "attendee_gender" NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "place" "booking_place" NOT NULL;