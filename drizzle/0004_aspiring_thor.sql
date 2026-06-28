CREATE TYPE "public"."priority" AS ENUM('LOW', 'MEDIUM', 'HIGH');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('TODO', 'IN_PROGRESS', 'DONE');--> statement-breakpoint
CREATE TABLE "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"color" text DEFAULT '#3b82f6' NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" "task_status" DEFAULT 'TODO' NOT NULL,
	"priority" "priority" DEFAULT 'MEDIUM' NOT NULL,
	"due_date" timestamp,
	"project_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;