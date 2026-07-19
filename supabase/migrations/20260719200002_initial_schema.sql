CREATE SCHEMA "private";
--> statement-breakpoint
CREATE TABLE "private"."github_repositories" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "private"."github_repositories_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"github_repository_id" bigint NOT NULL,
	"github_node_id" text NOT NULL,
	"owner_github_id" bigint NOT NULL,
	"owner_login" text NOT NULL,
	"owner_type" text NOT NULL,
	"name" text NOT NULL,
	"full_name" text NOT NULL,
	"html_url" text NOT NULL,
	"default_branch" text NOT NULL,
	"visibility" text NOT NULL,
	"is_fork" boolean NOT NULL,
	"parent_github_repository_id" bigint,
	"archived" boolean NOT NULL,
	"disabled" boolean NOT NULL,
	"github_created_at" timestamp with time zone NOT NULL,
	"github_updated_at" timestamp with time zone NOT NULL,
	"github_pushed_at" timestamp with time zone,
	"api_etag" text,
	"metadata_fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "github_repositories_github_repository_id_unique" UNIQUE("github_repository_id"),
	CONSTRAINT "github_repositories_github_node_id_unique" UNIQUE("github_node_id"),
	CONSTRAINT "github_repositories_github_repository_id_positive" CHECK ("private"."github_repositories"."github_repository_id" > 0),
	CONSTRAINT "github_repositories_owner_github_id_positive" CHECK ("private"."github_repositories"."owner_github_id" > 0),
	CONSTRAINT "github_repositories_visibility_check" CHECK ("private"."github_repositories"."visibility" in ('public', 'private', 'internal')),
	CONSTRAINT "github_repositories_owner_type_check" CHECK ("private"."github_repositories"."owner_type" in ('User', 'Organization'))
);
--> statement-breakpoint
ALTER TABLE "private"."github_repositories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "hackathons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"devpost_url" text NOT NULL,
	"devpost_slug" text NOT NULL,
	"name" text NOT NULL,
	"organizer" text,
	"description" text,
	"cover_image_source_url" text,
	"cover_image_path" text,
	"cover_image_fetched_at" timestamp with time zone,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"project_count" integer,
	"indexing_status" text DEFAULT 'queued' NOT NULL,
	"indexing_stage" text,
	"indexing_progress_completed" integer DEFAULT 0 NOT NULL,
	"indexing_progress_total" integer,
	"last_indexed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hackathons_devpost_url_unique" UNIQUE("devpost_url"),
	CONSTRAINT "hackathons_devpost_slug_unique" UNIQUE("devpost_slug"),
	CONSTRAINT "hackathons_indexing_status_check" CHECK (indexing_status = ANY (ARRAY['queued'::text, 'running'::text, 'succeeded'::text, 'partial'::text, 'failed'::text])),
	CONSTRAINT "hackathons_indexing_stage_check" CHECK ("hackathons"."indexing_stage" is null or "hackathons"."indexing_stage" in ('discovering_projects', 'scraping_projects', 'ingesting_repositories', 'calculating_hacker_insights')),
	CONSTRAINT "hackathons_indexing_progress_completed_nonnegative" CHECK ("hackathons"."indexing_progress_completed" >= 0),
	CONSTRAINT "hackathons_indexing_progress_total_nonnegative" CHECK ("hackathons"."indexing_progress_total" is null or "hackathons"."indexing_progress_total" >= 0),
	CONSTRAINT "hackathons_indexing_progress_bounds" CHECK ("hackathons"."indexing_progress_total" is null or "hackathons"."indexing_progress_completed" <= "hackathons"."indexing_progress_total"),
	CONSTRAINT "hackathons_cover_image_storage_check" CHECK ((cover_image_path is null and cover_image_fetched_at is null) or (nullif(btrim(cover_image_path), '') is not null and cover_image_fetched_at is not null))
);
--> statement-breakpoint
ALTER TABLE "hackathons" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "private"."hacker_contributor_metrics" (
	"run_id" bigint NOT NULL,
	"project_id" uuid NOT NULL,
	"github_user_id" bigint NOT NULL,
	"github_login" text NOT NULL,
	"display_name" text NOT NULL,
	"credited_commit_count" bigint DEFAULT 0 NOT NULL,
	"credited_additions" bigint DEFAULT 0 NOT NULL,
	"credited_deletions" bigint DEFAULT 0 NOT NULL,
	CONSTRAINT "hacker_contributor_metrics_pkey" PRIMARY KEY("run_id","project_id","github_user_id"),
	CONSTRAINT "hacker_contributor_metrics_identity_check" CHECK ("private"."hacker_contributor_metrics"."github_user_id" > 0
          and nullif(btrim("private"."hacker_contributor_metrics"."github_login"), '') is not null
          and nullif(btrim("private"."hacker_contributor_metrics"."display_name"), '') is not null),
	CONSTRAINT "hacker_contributor_metrics_nonnegative_check" CHECK ("private"."hacker_contributor_metrics"."credited_commit_count" >= 0
          and "private"."hacker_contributor_metrics"."credited_additions" >= 0
          and "private"."hacker_contributor_metrics"."credited_deletions" >= 0)
);
--> statement-breakpoint
ALTER TABLE "private"."hacker_contributor_metrics" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "private"."hacker_insight_runs" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "private"."hacker_insight_runs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"hackathon_id" uuid NOT NULL,
	"source_last_indexed_at" timestamp with time zone NOT NULL,
	"window_starts_at" timestamp with time zone NOT NULL,
	"window_ends_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"error_detail" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hacker_insight_runs_source_unique" UNIQUE("hackathon_id","source_last_indexed_at"),
	CONSTRAINT "hacker_insight_runs_status_check" CHECK ("private"."hacker_insight_runs"."status" in ('queued', 'running', 'succeeded', 'failed')),
	CONSTRAINT "hacker_insight_runs_window_check" CHECK ("private"."hacker_insight_runs"."window_ends_at" >= "private"."hacker_insight_runs"."window_starts_at"),
	CONSTRAINT "hacker_insight_runs_lifecycle_check" CHECK ((
          ("private"."hacker_insight_runs"."status" = 'queued' and "private"."hacker_insight_runs"."started_at" is null and "private"."hacker_insight_runs"."completed_at" is null and "private"."hacker_insight_runs"."error_detail" is null)
          or ("private"."hacker_insight_runs"."status" = 'running' and "private"."hacker_insight_runs"."started_at" is not null and "private"."hacker_insight_runs"."completed_at" is null and "private"."hacker_insight_runs"."error_detail" is null)
          or ("private"."hacker_insight_runs"."status" = 'succeeded' and "private"."hacker_insight_runs"."started_at" is not null and "private"."hacker_insight_runs"."completed_at" is not null and "private"."hacker_insight_runs"."error_detail" is null)
          or ("private"."hacker_insight_runs"."status" = 'failed' and "private"."hacker_insight_runs"."started_at" is not null and "private"."hacker_insight_runs"."completed_at" is not null and nullif(btrim("private"."hacker_insight_runs"."error_detail"), '') is not null)
        ))
);
--> statement-breakpoint
ALTER TABLE "private"."hacker_insight_runs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "private"."hacker_team_metrics" (
	"run_id" bigint NOT NULL,
	"project_id" uuid NOT NULL,
	"commit_count" bigint DEFAULT 0 NOT NULL,
	"additions" bigint DEFAULT 0 NOT NULL,
	"deletions" bigint DEFAULT 0 NOT NULL,
	CONSTRAINT "hacker_team_metrics_pkey" PRIMARY KEY("run_id","project_id"),
	CONSTRAINT "hacker_team_metrics_nonnegative_check" CHECK ("private"."hacker_team_metrics"."commit_count" >= 0
          and "private"."hacker_team_metrics"."additions" >= 0
          and "private"."hacker_team_metrics"."deletions" >= 0)
);
--> statement-breakpoint
ALTER TABLE "private"."hacker_team_metrics" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "indexing_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submitted_url" text NOT NULL,
	"normalized_url" text NOT NULL,
	"source_type" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"submitted_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone,
	"hackathon_id" uuid,
	"project_id" uuid,
	"destination_path" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"progress_stage" text,
	"progress_completed" integer DEFAULT 0 NOT NULL,
	"progress_total" integer,
	CONSTRAINT "indexing_requests_normalized_url_check" CHECK ((source_type = 'hackathon' and normalized_url ~ '^https://[a-z0-9-]+\.devpost\.com/$') or (source_type = 'project' and normalized_url ~ '^https://devpost\.com/software/[^/?#]+$')),
	CONSTRAINT "indexing_requests_source_type_check" CHECK (source_type = ANY (ARRAY['hackathon'::text, 'project'::text])),
	CONSTRAINT "indexing_requests_status_check" CHECK (status = ANY (ARRAY['pending'::text, 'queued'::text, 'running'::text, 'ready'::text, 'rejected'::text, 'failed'::text])),
	CONSTRAINT "indexing_requests_destination_path_check" CHECK (destination_path is null or destination_path like '/hackathons/%'),
	CONSTRAINT "indexing_requests_progress_nonnegative_check" CHECK (progress_completed >= 0 and (progress_total is null or progress_total >= 0)),
	CONSTRAINT "indexing_requests_progress_bounds_check" CHECK (progress_total is null or progress_completed <= progress_total)
);
--> statement-breakpoint
ALTER TABLE "indexing_requests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "private"."project_embedding_sources" (
	"project_id" uuid PRIMARY KEY NOT NULL,
	"inspiration" text NOT NULL,
	"what_it_does" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_embedding_sources_nonblank_check" CHECK (nullif(btrim("private"."project_embedding_sources"."inspiration"), '') is not null
          and nullif(btrim("private"."project_embedding_sources"."what_it_does"), '') is not null)
);
--> statement-breakpoint
ALTER TABLE "private"."project_embedding_sources" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "private"."project_repositories" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "private"."project_repositories_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"project_id" uuid NOT NULL,
	"repository_id" bigint NOT NULL,
	"source_url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_repositories_project_repository_unique" UNIQUE("project_id","repository_id")
);
--> statement-breakpoint
ALTER TABLE "private"."project_repositories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hackathon_id" uuid NOT NULL,
	"devpost_url" text NOT NULL,
	"devpost_slug" text NOT NULL,
	"name" text NOT NULL,
	"tagline" text,
	"cover_image_source_url" text,
	"cover_image_path" text,
	"cover_image_fetched_at" timestamp with time zone,
	"description" text,
	"demo_url" text,
	"video_url" text,
	"github_url" text,
	"is_winner" boolean DEFAULT false NOT NULL,
	"winning_track" text,
	"team_data" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"built_with_data" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"ingestion_completed_at" timestamp with time zone,
	"ingestion_status" text DEFAULT 'pending' NOT NULL,
	"ingestion_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "projects_hackathon_slug_unique" UNIQUE("hackathon_id","devpost_slug"),
	CONSTRAINT "projects_winner_track_check" CHECK (("projects"."is_winner" and nullif(btrim("projects"."winning_track"), '') is not null) or (not "projects"."is_winner" and "projects"."winning_track" is null)),
	CONSTRAINT "projects_ingestion_status_check" CHECK ("projects"."ingestion_status" in ('pending', 'succeeded', 'partial', 'failed'))
);
--> statement-breakpoint
ALTER TABLE "projects" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "private"."repository_commit_authors" (
	"repository_commit_id" bigint NOT NULL,
	"author_position" smallint NOT NULL,
	"is_primary" boolean NOT NULL,
	"author_name" text NOT NULL,
	"author_email" text,
	"author_github_user_id" bigint,
	"author_github_login" text,
	CONSTRAINT "repository_commit_authors_pkey" PRIMARY KEY("repository_commit_id","author_position"),
	CONSTRAINT "repository_commit_authors_position_check" CHECK ("private"."repository_commit_authors"."author_position" >= 0
          and "private"."repository_commit_authors"."is_primary" = ("private"."repository_commit_authors"."author_position" = 0)),
	CONSTRAINT "repository_commit_authors_github_identity_check" CHECK ((
          "private"."repository_commit_authors"."author_github_user_id" is null and "private"."repository_commit_authors"."author_github_login" is null
        ) or (
          "private"."repository_commit_authors"."author_github_user_id" > 0
          and nullif(btrim("private"."repository_commit_authors"."author_github_login"), '') is not null
        ))
);
--> statement-breakpoint
ALTER TABLE "private"."repository_commit_authors" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "private"."repository_commits" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "private"."repository_commits_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"project_repository_id" bigint NOT NULL,
	"commit_sha" text NOT NULL,
	"author_name" text NOT NULL,
	"author_email" text NOT NULL,
	"author_github_user_id" bigint,
	"author_github_login" text,
	"authored_at" timestamp with time zone NOT NULL,
	"committed_at" timestamp with time zone NOT NULL,
	"message" text NOT NULL,
	"parent_shas" text[] DEFAULT '{}'::text[] NOT NULL,
	"additions" integer,
	"deletions" integer,
	"changed_files" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "repository_commits_project_repository_sha_unique" UNIQUE("project_repository_id","commit_sha"),
	CONSTRAINT "repository_commits_additions_nonnegative" CHECK ("private"."repository_commits"."additions" is null or "private"."repository_commits"."additions" >= 0),
	CONSTRAINT "repository_commits_deletions_nonnegative" CHECK ("private"."repository_commits"."deletions" is null or "private"."repository_commits"."deletions" >= 0),
	CONSTRAINT "repository_commits_changed_files_nonnegative" CHECK ("private"."repository_commits"."changed_files" is null or "private"."repository_commits"."changed_files" >= 0)
);
--> statement-breakpoint
ALTER TABLE "private"."repository_commits" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "private"."repository_dependencies" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "private"."repository_dependencies_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"project_repository_id" bigint NOT NULL,
	"ecosystem" text NOT NULL,
	"package_name" text NOT NULL,
	"version_constraint" text,
	"dependency_kind" text NOT NULL,
	"manifest_path" text NOT NULL,
	"indexed_commit_sha" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "repository_dependencies_identity_unique" UNIQUE("project_repository_id","ecosystem","manifest_path","package_name","dependency_kind")
);
--> statement-breakpoint
ALTER TABLE "private"."repository_dependencies" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "private"."repository_files" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "private"."repository_files_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"project_repository_id" bigint NOT NULL,
	"path" text NOT NULL,
	"blob_sha" text NOT NULL,
	"indexed_commit_sha" text NOT NULL,
	"language" text,
	"size_bytes" bigint NOT NULL,
	"line_count" integer,
	"is_binary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "repository_files_project_repository_path_unique" UNIQUE("project_repository_id","path"),
	CONSTRAINT "repository_files_size_bytes_nonnegative" CHECK ("private"."repository_files"."size_bytes" >= 0),
	CONSTRAINT "repository_files_line_count_nonnegative" CHECK ("private"."repository_files"."line_count" is null or "private"."repository_files"."line_count" >= 0)
);
--> statement-breakpoint
ALTER TABLE "private"."repository_files" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "private"."repository_ingestion_runs" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "private"."repository_ingestion_runs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"project_repository_id" bigint NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"requested_ref" text,
	"resolved_commit_sha" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"error_detail" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "repository_ingestion_runs_status_check" CHECK ("private"."repository_ingestion_runs"."status" in ('queued', 'running', 'succeeded', 'partial', 'failed'))
);
--> statement-breakpoint
ALTER TABLE "private"."repository_ingestion_runs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "private"."hacker_contributor_metrics" ADD CONSTRAINT "hacker_contributor_metrics_team_fkey" FOREIGN KEY ("run_id","project_id") REFERENCES "private"."hacker_team_metrics"("run_id","project_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "private"."hacker_insight_runs" ADD CONSTRAINT "hacker_insight_runs_hackathon_id_fkey" FOREIGN KEY ("hackathon_id") REFERENCES "public"."hackathons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "private"."hacker_team_metrics" ADD CONSTRAINT "hacker_team_metrics_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "private"."hacker_insight_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "private"."hacker_team_metrics" ADD CONSTRAINT "hacker_team_metrics_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indexing_requests" ADD CONSTRAINT "indexing_requests_hackathon_id_fkey" FOREIGN KEY ("hackathon_id") REFERENCES "public"."hackathons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indexing_requests" ADD CONSTRAINT "indexing_requests_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "private"."project_embedding_sources" ADD CONSTRAINT "project_embedding_sources_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "private"."project_repositories" ADD CONSTRAINT "project_repositories_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "private"."project_repositories" ADD CONSTRAINT "project_repositories_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "private"."github_repositories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_hackathon_id_fkey" FOREIGN KEY ("hackathon_id") REFERENCES "public"."hackathons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "private"."repository_commit_authors" ADD CONSTRAINT "repository_commit_authors_repository_commit_id_fkey" FOREIGN KEY ("repository_commit_id") REFERENCES "private"."repository_commits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "private"."repository_commits" ADD CONSTRAINT "repository_commits_project_repository_id_fkey" FOREIGN KEY ("project_repository_id") REFERENCES "private"."project_repositories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "private"."repository_dependencies" ADD CONSTRAINT "repository_dependencies_project_repository_id_fkey" FOREIGN KEY ("project_repository_id") REFERENCES "private"."project_repositories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "private"."repository_files" ADD CONSTRAINT "repository_files_project_repository_id_fkey" FOREIGN KEY ("project_repository_id") REFERENCES "private"."project_repositories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "private"."repository_ingestion_runs" ADD CONSTRAINT "repository_ingestion_runs_project_repository_id_fkey" FOREIGN KEY ("project_repository_id") REFERENCES "private"."project_repositories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "github_repositories_full_name_idx" ON "private"."github_repositories" USING btree (lower("full_name"));--> statement-breakpoint
CREATE INDEX "hackathons_indexing_status_idx" ON "hackathons" USING btree ("indexing_status" text_ops);--> statement-breakpoint
CREATE INDEX "hacker_contributor_metrics_run_github_user_idx" ON "private"."hacker_contributor_metrics" USING btree ("run_id","github_user_id");--> statement-breakpoint
CREATE INDEX "hacker_insight_runs_hackathon_status_completed_idx" ON "private"."hacker_insight_runs" USING btree ("hackathon_id","status","completed_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "indexing_requests_hackathon_id_idx" ON "indexing_requests" USING btree ("hackathon_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "indexing_requests_submitted_by_idx" ON "indexing_requests" USING btree ("submitted_by");--> statement-breakpoint
CREATE INDEX "indexing_requests_submitted_by_created_at_idx" ON "indexing_requests" USING btree ("submitted_by","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "indexing_requests_source_status_idx" ON "indexing_requests" USING btree ("source_type","status");--> statement-breakpoint
CREATE INDEX "indexing_requests_normalized_url_idx" ON "indexing_requests" USING btree ("normalized_url");--> statement-breakpoint
CREATE INDEX "project_repositories_repository_id_idx" ON "private"."project_repositories" USING btree ("repository_id");--> statement-breakpoint
CREATE INDEX "projects_hackathon_id_idx" ON "projects" USING btree ("hackathon_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "repository_commit_authors_github_user_id_idx" ON "private"."repository_commit_authors" USING btree ("author_github_user_id");--> statement-breakpoint
CREATE INDEX "repository_commits_project_repository_authored_at_idx" ON "private"."repository_commits" USING btree ("project_repository_id","authored_at");--> statement-breakpoint
CREATE INDEX "repository_commits_project_repository_author_email_idx" ON "private"."repository_commits" USING btree ("project_repository_id","author_email");--> statement-breakpoint
CREATE INDEX "repository_dependencies_project_package_idx" ON "private"."repository_dependencies" USING btree ("project_repository_id","package_name");--> statement-breakpoint
CREATE INDEX "repository_dependencies_ecosystem_package_idx" ON "private"."repository_dependencies" USING btree ("ecosystem","package_name");--> statement-breakpoint
CREATE INDEX "repository_files_project_repository_language_idx" ON "private"."repository_files" USING btree ("project_repository_id","language");--> statement-breakpoint
CREATE INDEX "repository_ingestion_runs_project_repository_created_at_idx" ON "private"."repository_ingestion_runs" USING btree ("project_repository_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "repository_ingestion_runs_status_created_at_idx" ON "private"."repository_ingestion_runs" USING btree ("status","created_at");