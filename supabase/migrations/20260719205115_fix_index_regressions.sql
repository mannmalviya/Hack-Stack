DROP INDEX "private"."hacker_contributor_metrics_run_github_user_idx";--> statement-breakpoint
DROP INDEX "private"."hacker_insight_runs_hackathon_status_completed_idx";--> statement-breakpoint
CREATE INDEX "hacker_insight_runs_hackathon_status_completed_idx" ON "private"."hacker_insight_runs" USING btree ("hackathon_id","status","completed_at" DESC NULLS FIRST);