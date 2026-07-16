import { relations } from "drizzle-orm";

import { hackathonRequests } from "./hackathon-requests";
import { hackathons } from "./hackathons";
import { projects } from "./projects";

// Re-export every table from one entry point for application queries and the
// schema object passed to the Drizzle client.
export { hackathonRequests } from "./hackathon-requests";
export { hackathons } from "./hackathons";
export { projects } from "./projects";

// An approved request may point to the hackathon that was created from it.
export const hackathonRequestsRelations = relations(
  hackathonRequests,
  ({ one }) => ({
    hackathon: one(hackathons, {
      fields: [hackathonRequests.approvedHackathonId],
      references: [hackathons.id],
    }),
  }),
);

// A hackathon can be referenced by approval requests and contain many projects.
export const hackathonsRelations = relations(hackathons, ({ many }) => ({
  hackathonRequests: many(hackathonRequests),
  projects: many(projects),
}));

// Every imported project belongs to exactly one hackathon.
export const projectsRelations = relations(projects, ({ one }) => ({
  hackathon: one(hackathons, {
    fields: [projects.hackathonId],
    references: [hackathons.id],
  }),
}));
