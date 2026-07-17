export const IMPORT_LIMITS = [5, 10, 20, "all"] as const;
export type ImportLimit = (typeof IMPORT_LIMITS)[number];

export function parseImportLimit(value: string): ImportLimit | null {
  if (value.toLowerCase() === "all") return "all";
  const parsed = Number(value);
  return parsed === 5 || parsed === 10 || parsed === 20 ? parsed : null;
}

