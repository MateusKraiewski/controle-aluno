ALTER TABLE "lessons" ADD CONSTRAINT "lessons_student_id_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_student_id_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lessons_student_date_idx" ON "lessons" USING btree ("student_id","lesson_date");--> statement-breakpoint
CREATE INDEX "lessons_subject_student_idx" ON "lessons" USING btree ("subject_id","student_id");--> statement-breakpoint
CREATE INDEX "subjects_student_name_idx" ON "subjects" USING btree ("student_id","name");