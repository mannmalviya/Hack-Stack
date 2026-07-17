export type StoredProjectState = {
  ingestionCompletedAt: string | null;
};

export function shouldProcessProject(stored: StoredProjectState | undefined) {
  return !stored?.ingestionCompletedAt;
}
