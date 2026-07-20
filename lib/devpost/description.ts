export type DescriptionSection = {
  /** null for prose that appears before the first recognised heading. */
  heading: string | null;
  body: string;
};

const APOSTROPHE = "['’]";

// Devpost's own submission template. The scraper flattens the rendered page
// into a single line, so these headings survive only as inline text and are the
// one reliable seam for restoring structure.
const SECTIONS: Array<{ heading: string; pattern: string }> = [
  { heading: "Inspiration", pattern: "Inspiration" },
  { heading: "What it does", pattern: "What it does" },
  { heading: "How we built it", pattern: "How we built it" },
  { heading: "Challenges we ran into", pattern: "Challenges we ran into" },
  {
    heading: "Accomplishments we're proud of",
    pattern: `Accomplishments that we${APOSTROPHE}re proud of`,
  },
  { heading: "What we learned", pattern: "What we learned" },
  { heading: "What's next", pattern: `What${APOSTROPHE}s next` },
];

function escapeRegExp(value: string) {
  return value.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

/**
 * Turns a flattened Devpost description into ordered sections.
 *
 * Headings are only accepted in Devpost's own order, which keeps a phrase like
 * "Inspiration" inside body prose from starting a bogus section. `projectName`
 * lets the trailing "What's next for <project>" heading be consumed whole,
 * which is otherwise ambiguous for multi-word names.
 */
export function splitDevpostDescription(
  description: string,
  projectName?: string,
): DescriptionSection[] {
  const matches: Array<{ heading: string; start: number; end: number }> = [];
  let searchFrom = 0;

  for (const section of SECTIONS) {
    let pattern = section.pattern;
    if (section.heading === "What's next" && projectName) {
      pattern += `(?: for ${escapeRegExp(projectName)})?`;
    }
    const regex = new RegExp(pattern, "g");
    regex.lastIndex = searchFrom;
    const match = regex.exec(description);
    if (!match) continue;
    matches.push({ heading: section.heading, start: match.index, end: regex.lastIndex });
    searchFrom = regex.lastIndex;
  }

  const sections: DescriptionSection[] = [];
  const lead = description.slice(0, matches[0]?.start ?? description.length).trim();
  if (lead) sections.push({ heading: null, body: lead });

  for (const [index, match] of matches.entries()) {
    const body = description.slice(match.end, matches[index + 1]?.start).trim();
    if (body) sections.push({ heading: match.heading, body });
  }

  return sections;
}
