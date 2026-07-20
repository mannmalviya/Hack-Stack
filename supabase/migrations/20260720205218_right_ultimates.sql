CREATE TABLE "private"."feature_verification_results" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "private"."feature_verification_results_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"run_id" bigint NOT NULL,
	"feature_name" text NOT NULL,
	"feature_claim" text,
	"claim_source" text NOT NULL,
	"verification_outcome" text NOT NULL,
	"evidence" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"confidence" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "feature_verification_results_claim_source_check" CHECK ("private"."feature_verification_results"."claim_source" in ('devpost', 'readme')),
	CONSTRAINT "feature_verification_results_outcome_check" CHECK ("private"."feature_verification_results"."verification_outcome" in ('verified', 'code_supported', 'claimed_only', 'blocked')),
	CONSTRAINT "feature_verification_results_confidence_check" CHECK ("private"."feature_verification_results"."confidence" is null or "private"."feature_verification_results"."confidence" in ('high', 'medium', 'low'))
);
--> statement-breakpoint
ALTER TABLE "private"."feature_verification_results" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "private"."feature_verification_runs" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "private"."feature_verification_runs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"project_repository_id" bigint NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"resolved_commit_sha" text,
	"feature_count" bigint,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"error_detail" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "feature_verification_runs_status_check" CHECK ("private"."feature_verification_runs"."status" in ('queued', 'running', 'succeeded', 'partial', 'failed'))
);
--> statement-breakpoint
ALTER TABLE "private"."feature_verification_runs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "private"."feature_verification_results" ADD CONSTRAINT "feature_verification_results_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "private"."feature_verification_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "private"."feature_verification_runs" ADD CONSTRAINT "feature_verification_runs_project_repository_id_fkey" FOREIGN KEY ("project_repository_id") REFERENCES "private"."project_repositories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "feature_verification_results_run_id_idx" ON "private"."feature_verification_results" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "feature_verification_runs_project_repository_created_at_idx" ON "private"."feature_verification_runs" USING btree ("project_repository_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "feature_verification_runs_status_created_at_idx" ON "private"."feature_verification_runs" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "feature_verification_runs_project_repository_status_idx" ON "private"."feature_verification_runs" USING btree ("project_repository_id","status");