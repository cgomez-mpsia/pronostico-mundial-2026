ALTER TABLE "match_points" DROP CONSTRAINT "match_points_total_check";--> statement-breakpoint
ALTER TABLE "match_points" ADD COLUMN "qualifier_points" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "predictions" ADD COLUMN "qualifier_team_id" uuid;--> statement-breakpoint
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_qualifier_team_id_teams_id_fk" FOREIGN KEY ("qualifier_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_points" ADD CONSTRAINT "match_points_qualifier_check" CHECK ("match_points"."qualifier_points" IN (0, 1));--> statement-breakpoint
ALTER TABLE "match_points" ADD CONSTRAINT "match_points_total_check" CHECK ("match_points"."total_points" <= 4);