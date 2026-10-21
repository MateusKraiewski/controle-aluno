CREATE TABLE "lesson_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" text NOT NULL,
	"lesson_id" uuid NOT NULL,
	"storage_key" text NOT NULL,
	"file_name" text NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lesson_attachments_size_positive" CHECK ("lesson_attachments"."size_bytes" > 0)
);
--> statement-breakpoint
ALTER TABLE "lesson_attachments" ADD CONSTRAINT "lesson_attachments_student_id_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_attachments" ADD CONSTRAINT "lesson_attachments_lesson_fk" FOREIGN KEY ("lesson_id","student_id") REFERENCES "public"."lessons"("id","student_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "lesson_attachments_storage_key_unique" ON "lesson_attachments" USING btree ("storage_key");--> statement-breakpoint
CREATE INDEX "lesson_attachments_lesson_idx" ON "lesson_attachments" USING btree ("lesson_id");