CREATE TYPE "public"."attendance_status" AS ENUM('unrecorded', 'attended', 'student_absent', 'teacher_absent');--> statement-breakpoint
CREATE TABLE "lessons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" text NOT NULL,
	"subject_id" uuid NOT NULL,
	"lesson_date" date NOT NULL,
	"starts_at" time NOT NULL,
	"ends_at" time NOT NULL,
	"planned_content" text,
	"studied_content" text,
	"attendance" "attendance_status" DEFAULT 'unrecorded' NOT NULL,
	"attendance_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lessons_id_student_id_unique" UNIQUE("id","student_id")
);
--> statement-breakpoint
CREATE TABLE "subjects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" text NOT NULL,
	"name" text NOT NULL,
	"color" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subjects_id_student_id_unique" UNIQUE("id","student_id")
);
--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_subject_student_fk" FOREIGN KEY ("subject_id","student_id") REFERENCES "public"."subjects"("id","student_id") ON DELETE no action ON UPDATE no action;