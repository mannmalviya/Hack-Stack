import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  foreignKey,
  index,
  jsonb,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { featureVerificationRuns } from "./feature-verification-runs";
import { privateSchema } from "./github-repositories";

// One claimed feature and how it held up against the code. Evidence is stored as
// a JSONB array of { file, line, rationale } citations, empty for claims with no
// supporting code (claimed_only) or that could not be checked (blocked).
export const featureVerificationResults = privateSchema
  .table(
    "feature_verification_results",
    {
      id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
      runId: bigint("run_id", { mode: "number" }).notNull(),
      featureName: text("feature_name").notNull(),
      featureClaim: text("feature_claim"),
      claimSource: text("claim_source").notNull(),
      verificationOutcome: text("verification_outcome").notNull(),
      evidence: jsonb().default(sql`'[]'::jsonb`).notNull(),
      confidence: text(),
      createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
        .defaultNow()
        .notNull(),
      updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
        .defaultNow()
        .notNull(),
    },
    (table) => [
      foreignKey({
        columns: [table.runId],
        foreignColumns: [featureVerificationRuns.id],
        name: "feature_verification_results_run_id_fkey",
      }).onDelete("cascade"),
      check(
        "feature_verification_results_claim_source_check",
        sql`${table.claimSource} in ('devpost', 'readme')`,
      ),
      // The four verification outcomes are mandated by the product spec.
      check(
        "feature_verification_results_outcome_check",
        sql`${table.verificationOutcome} in ('verified', 'code_supported', 'claimed_only', 'blocked')`,
      ),
      check(
        "feature_verification_results_confidence_check",
        sql`${table.confidence} is null or ${table.confidence} in ('high', 'medium', 'low')`,
      ),
      index("feature_verification_results_run_id_idx").on(table.runId),
    ],
  )
  .enableRLS();

export type FeatureVerificationResult =
  typeof featureVerificationResults.$inferSelect;
export type NewFeatureVerificationResult =
  typeof featureVerificationResults.$inferInsert;
