CREATE TYPE "public"."resolution_outcome" AS ENUM('held', 'student_absent', 'teacher_absent', 'not_held');--> statement-breakpoint
CREATE TYPE "public"."resolution_status" AS ENUM('proposed', 'agreed', 'declined');--> statement-breakpoint
CREATE TABLE "lesson_resolutions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lesson_id" uuid NOT NULL,
	"link_id" uuid NOT NULL,
	"outcome" "resolution_outcome" NOT NULL,
	"note" text,
	"status" "resolution_status" DEFAULT 'proposed' NOT NULL,
	"proposed_by" text NOT NULL,
	"proposed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"responded_by" text,
	"responded_at" timestamp with time zone,
	CONSTRAINT "lesson_resolutions_responder_differs" CHECK ("lesson_resolutions"."responded_by" IS NULL OR "lesson_resolutions"."responded_by" <> "lesson_resolutions"."proposed_by")
);
--> statement-breakpoint
ALTER TABLE "lesson_resolutions" ADD CONSTRAINT "lesson_resolutions_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_resolutions" ADD CONSTRAINT "lesson_resolutions_link_id_teacher_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."teacher_links"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_resolutions" ADD CONSTRAINT "lesson_resolutions_proposed_by_user_id_fk" FOREIGN KEY ("proposed_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_resolutions" ADD CONSTRAINT "lesson_resolutions_responded_by_user_id_fk" FOREIGN KEY ("responded_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lesson_resolutions_lesson_idx" ON "lesson_resolutions" USING btree ("lesson_id","proposed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "lesson_resolutions_one_open_per_lesson" ON "lesson_resolutions" USING btree ("lesson_id") WHERE "lesson_resolutions"."status" = 'proposed';