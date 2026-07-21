import "server-only";

/**
 * Shared cache settings for the hackathon aggregate reads.
 *
 * These queries derive AI coding-agent signals from repository file paths and
 * commit metadata, which requires unindexable pattern matching across every
 * file and commit in the hackathon. Their inputs change only when a repository
 * is re-ingested, so both are cached under one tag and can be refreshed
 * together with revalidateTag(HACKATHON_CACHE_TAG) after an import completes.
 */
export const HACKATHON_CACHE_TAG = "hackathon-aggregates";

export const HACKATHON_CACHE_SECONDS = 3600;
