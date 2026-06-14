ALTER TABLE "matches" ADD COLUMN "external_id" integer;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "result_source" text;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "last_synced_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "external_id" integer;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_external_id_unique" UNIQUE("external_id");--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_external_id_unique" UNIQUE("external_id");--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_result_source_check" CHECK ("matches"."result_source" IS NULL OR "matches"."result_source" IN ('auto', 'manual'));