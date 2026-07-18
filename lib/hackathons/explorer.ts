export type HackathonDateOrder = "newest" | "oldest";

type DatedHackathon = {
  startsAt: string | null;
  endsAt: string | null;
};

const TRAILING_EDITION_PATTERN = new RegExp(
  String.raw`\s*(?:[-–—|:]\s*)?(?:(?:19|20)\d{2}(?:\s*[-–—/]\s*(?:(?:19|20)?\d{2}))?|\d+(?:\.\d+)?(?:st|nd|rd|th)?)(?:\s+(?:annual|edition|hackathon))?\s*$`,
  "i",
);

/** Groups dated editions under the event brand shown to judges. */
export function getHackathonHost(name: string) {
  const normalizedName = name.trim();
  const eventBrand = normalizedName.replace(TRAILING_EDITION_PATTERN, "").trim();
  return eventBrand || normalizedName;
}

function getEventTimestamp(hackathon: DatedHackathon) {
  for (const date of [hackathon.startsAt, hackathon.endsAt]) {
    if (!date) continue;
    const timestamp = Date.parse(date);
    if (!Number.isNaN(timestamp)) return timestamp;
  }
  return null;
}

export function compareHackathonsByDate(
  left: DatedHackathon,
  right: DatedHackathon,
  order: HackathonDateOrder,
) {
  const leftTimestamp = getEventTimestamp(left);
  const rightTimestamp = getEventTimestamp(right);

  if (leftTimestamp === null) return rightTimestamp === null ? 0 : 1;
  if (rightTimestamp === null) return -1;
  return order === "newest"
    ? rightTimestamp - leftTimestamp
    : leftTimestamp - rightTimestamp;
}
