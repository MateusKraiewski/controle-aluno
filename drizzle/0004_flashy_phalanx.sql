DROP INDEX "subjects_student_name_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "subjects_student_name_unique" ON "subjects" USING btree ("student_id","name");