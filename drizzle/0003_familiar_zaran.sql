ALTER TABLE "matches" ADD COLUMN "extra_time" text;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "match_winner_id" uuid;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_match_winner_id_teams_id_fk" FOREIGN KEY ("match_winner_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_extra_time_check" CHECK ("matches"."extra_time" IS NULL OR "matches"."extra_time" IN ('aet', 'pen'));