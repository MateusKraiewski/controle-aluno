CREATE TYPE "public"."objective_status" AS ENUM('open', 'practising', 'done');--> statement-breakpoint
CREATE TABLE "learning_objectives" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" text NOT NULL,
	"subject_id" uuid NOT NULL,
	"title" text NOT NULL,
	"status" "objective_status" DEFAULT 'open' NOT NULL,
	"snoozed_until" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lesson_objectives" (
	"lesson_id" uuid NOT NULL,
	"objective_id" uuid NOT NULL,
	"student_id" text NOT NULL,
	CONSTRAINT "lesson_objectives_pk" PRIMARY KEY("lesson_id","objective_id")
);
--> statement-breakpoint
ALTER TABLE "learning_objectives" ADD CONSTRAINT "learning_objectives_student_id_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_objectives" ADD CONSTRAINT "learning_objectives_subject_fk" FOREIGN KEY ("subject_id","student_id") REFERENCES "public"."subjects"("id","student_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_objectives" ADD CONSTRAINT "lesson_objectives_objective_id_learning_objectives_id_fk" FOREIGN KEY ("objective_id") REFERENCES "public"."learning_objectives"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_objectives" ADD CONSTRAINT "lesson_objectives_lesson_fk" FOREIGN KEY ("lesson_id","student_id") REFERENCES "public"."lessons"("id","student_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "learning_objectives_student_idx" ON "learning_objectives" USING btree ("student_id","status");--> statement-breakpoint
CREATE INDEX "learning_objectives_subject_idx" ON "learning_objectives" USING btree ("subject_id");--> statement-breakpoint
CREATE INDEX "lesson_objectives_objective_idx" ON "lesson_objectives" USING btree ("objective_id");