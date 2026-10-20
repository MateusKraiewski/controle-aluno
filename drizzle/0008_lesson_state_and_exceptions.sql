CREATE TYPE "public"."lesson_status" AS ENUM('planned', 'cancelled');--> statement-breakpoint
DROP INDEX "lessons_series_date_unique";--> statement-breakpoint
ALTER TABLE "lessons" ADD COLUMN "original_lesson_date" date;--> statement-breakpoint
ALTER TABLE "lessons" ADD COLUMN "is_exception" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "lessons" ADD COLUMN "status" "lesson_status" DEFAULT 'planned' NOT NULL;--> statement-breakpoint
ALTER TABLE "lessons" ADD COLUMN "cancellation_reason" text;--> statement-breakpoint
ALTER TABLE "lessons" ADD COLUMN "cancelled_at" timestamp with time zone;--> statement-breakpoint
UPDATE "lessons" SET "original_lesson_date" = "lesson_date" WHERE "series_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "lessons_series_original_date_unique" ON "lessons" USING btree ("series_id","original_lesson_date");--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_series_original_date_present" CHECK ("lessons"."series_id" IS NULL OR "lessons"."original_lesson_date" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_cancelled_at_matches_status" CHECK (("lessons"."status" = 'cancelled') = ("lessons"."cancelled_at" IS NOT NULL));