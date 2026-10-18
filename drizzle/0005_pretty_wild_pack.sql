ALTER TABLE "lessons" ADD COLUMN "attendance_recorded_by" text;--> statement-breakpoint
ALTER TABLE "lessons" ADD COLUMN "attendance_recorded_at" timestamp with time zone;--> statement-breakpoint
UPDATE "lessons" SET "attendance_recorded_by" = "student_id", "attendance_recorded_at" = "updated_at" WHERE "attendance" <> 'unrecorded';--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_attendance_recorded_by_user_id_fk" FOREIGN KEY ("attendance_recorded_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
