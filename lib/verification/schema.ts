import { z } from "zod";

// The four verification outcomes mandated by the product spec (AGENTS.md). This
// list is the single source of truth for the union; the DB check constraint on
// feature_verification_results.verification_outcome mirrors it exactly.
export const VERIFICATION_OUTCOMES = [
  "verified",
  "code_supported",
  "claimed_only",
  "blocked",
] as const;

export const CLAIM_SOURCES = ["devpost", "readme"] as const;
export const CONFIDENCE_LEVELS = ["high", "medium", "low"] as const;

// A single code citation. `line` is nullable because a feature can be evidenced
// by a whole file or directory rather than one line.
const evidenceSchema = z.object({
  file: z.string().min(1),
  line: z.number().int().nullable(),
  rationale: z.string().min(1),
});

const featureSchema = z.object({
  featureName: z.string().min(1),
  featureClaim: z.string().min(1),
  claimSource: z.enum(CLAIM_SOURCES),
  verificationOutcome: z.enum(VERIFICATION_OUTCOMES),
  confidence: z.enum(CONFIDENCE_LEVELS),
  evidence: z.array(evidenceSchema),
});

// The exact JSON shape claude -p must emit. Kept byte-for-byte in sync with the
// contract described in lib/verification/prompt.ts.
export const verificationPayloadSchema = z.object({
  features: z.array(featureSchema),
});

export type EvidenceCitation = z.infer<typeof evidenceSchema>;
export type VerifiedFeature = z.infer<typeof featureSchema>;
export type VerificationPayload = z.infer<typeof verificationPayloadSchema>;
