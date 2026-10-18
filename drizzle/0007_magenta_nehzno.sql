CREATE TABLE "lesson_series" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" text NOT NULL,
	"subject_id" uuid NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date NOT NULL,
	"starts_at" time NOT NULL,
	"ends_at" time NOT NULL,
	"time_zone" text NOT NULL,
	"weekdays" smallint[] NOT NULL,
	"interval_weeks" smallint DEFAULT 1 NOT NULL,
	"planned_content" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lesson_series_id_student_id_unique" UNIQUE("id","student_id"),
	CONSTRAINT "lesson_series_end_after_start" CHECK ("lesson_series"."ends_at" > "lesson_series"."starts_at"),
	CONSTRAINT "lesson_series_dates_ordered" CHECK ("lesson_series"."ends_on" >= "lesson_series"."starts_on"),
	CONSTRAINT "lesson_series_interval_valid" CHECK ("lesson_series"."interval_weeks" BETWEEN 1 AND 52),
	CONSTRAINT "lesson_series_weekdays_present" CHECK (cardinality("lesson_series"."weekdays") > 0)
);
--> statement-breakpoint
ALTER TABLE "lessons" ADD COLUMN "series_id" uuid;--> statement-breakpoint
ALTER TABLE "lesson_series" ADD CONSTRAINT "lesson_series_student_id_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_series" ADD CONSTRAINT "lesson_series_subject_student_fk" FOREIGN KEY ("subject_id","student_id") REFERENCES "public"."subjects"("id","student_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lesson_series_student_range_idx" ON "lesson_series" USING btree ("student_id","starts_on","ends_on");--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_series_student_fk" FOREIGN KEY ("series_id","student_id") REFERENCES "public"."lesson_series"("id","student_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "lessons_series_date_unique" ON "lessons" USING btree ("series_id","lesson_date");