export type IndexCoverage = "unknown" | "none" | "partial" | "complete";

export const indexCoverageLabels: Record<IndexCoverage, string> = {
  unknown: "Coverage unknown",
  none: "Not indexed",
  partial: "Partial coverage",
  complete: "Complete coverage",
};

export function getIndexCoverage(
  indexedProjectCount: number,
  availableProjectCount: number | null,
): IndexCoverage {
  if (availableProjectCount === null) return "unknown";
  if (indexedProjectCount >= availableProjectCount) return "complete";
  if (indexedProjectCount === 0) return "none";
  return "partial";
}

export function getIsFullyIndexed(
  indexingStatus: string,
  indexedProjectCount: number,
  availableProjectCount: number | null,
) {
  return indexingStatus === "succeeded"
    && getIndexCoverage(indexedProjectCount, availableProjectCount) === "complete";
}

export function formatIndexedProjectCount(
  indexedProjectCount: number,
  availableProjectCount: number | null,
) {
  if (availableProjectCount === null) {
    return `${indexedProjectCount} ${indexedProjectCount === 1 ? "project" : "projects"} indexed`;
  }
  return `${indexedProjectCount} of ${availableProjectCount} projects indexed`;
}
