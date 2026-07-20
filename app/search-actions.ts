"use server";

import { searchCatalog, type SearchResults } from "@/lib/data/search";

/** Typeahead for the header command menu. */
export async function searchCatalogAction(query: string): Promise<SearchResults> {
  if (typeof query !== "string") return { hackathons: [], projects: [] };
  return searchCatalog(query.slice(0, 200));
}
