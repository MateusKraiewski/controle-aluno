CREATE TYPE "public"."teacher_link_status" AS ENUM('pending', 'accepted', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."participant_attendance" AS ENUM('present', 'absent', 'excused');--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" text NOT NULL,
	"action" text NOT NULL,
	"link_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "participant_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lesson_id" uuid NOT NULL,
	"author_id" text NOT NULL,
	"link_id" uuid NOT NULL,
	"attendance" "participant_attendance" NOT NULL,
	"note" text,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teacher_link_subjects" (
	"link_id" uuid NOT NULL,
	"student_id" text NOT NULL,
	"subject_id" uuid NOT NULL,
	CONSTRAINT "teacher_link_subjects_pk" PRIMARY KEY("link_id","subject_id")
);
--> statement-breakpoint
CREATE TABLE "teacher_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"teacher_id" text NOT NULL,
	"student_id" text,
	"status" "teacher_link_status" DEFAULT 'pending' NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"accepted_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"revoked_by" text,
	CONSTRAINT "teacher_links_id_student_unique" UNIQUE("id","student_id"),
	CONSTRAINT "teacher_links_not_self" CHECK ("teacher_links"."student_id" IS NULL OR "teacher_links"."student_id" <> "teacher_links"."teacher_id"),
	CONSTRAINT "teacher_links_accepted_has_student" CHECK ("teacher_links"."status" = 'pending' OR "teacher_links"."student_id" IS NOT NULL OR "teacher_links"."revoked_at" IS NOT NULL)
);
--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_link_id_teacher_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."teacher_links"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participant_records" ADD CONSTRAINT "participant_records_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participant_records" ADD CONSTRAINT "participant_records_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participant_records" ADD CONSTRAINT "participant_records_link_id_teacher_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."teacher_links"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_link_subjects" ADD CONSTRAINT "teacher_link_subjects_link_fk" FOREIGN KEY ("link_id","student_id") REFERENCES "public"."teacher_links"("id","student_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_link_subjects" ADD CONSTRAINT "teacher_link_subjects_subject_fk" FOREIGN KEY ("subject_id","student_id") REFERENCES "public"."subjects"("id","student_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_links" ADD CONSTRAINT "teacher_links_teacher_id_user_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_links" ADD CONSTRAINT "teacher_links_student_id_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_links" ADD CONSTRAINT "teacher_links_revoked_by_user_id_fk" FOREIGN KEY ("revoked_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_events_link_idx" ON "audit_events" USING btree ("link_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_events_actor_idx" ON "audit_events" USING btree ("actor_id");--> statement-breakpoint
CREATE UNIQUE INDEX "participant_records_lesson_author_unique" ON "participant_records" USING btree ("lesson_id","author_id");--> statement-breakpoint
CREATE INDEX "participant_records_author_idx" ON "participant_records" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "participant_records_link_idx" ON "participant_records" USING btree ("link_id");--> statement-breakpoint
CREATE INDEX "teacher_link_subjects_subject_idx" ON "teacher_link_subjects" USING btree ("subject_id");--> statement-breakpoint
CREATE UNIQUE INDEX "teacher_links_token_hash_unique" ON "teacher_links" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "teacher_links_teacher_idx" ON "teacher_links" USING btree ("teacher_id","status");--> statement-breakpoint
CREATE INDEX "teacher_links_student_idx" ON "teacher_links" USING btree ("student_id","status");