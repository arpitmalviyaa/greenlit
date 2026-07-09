// Single source of truth for the corpus `vertical` partition.
// A vertical isolates one product's house-knowledge from another's. 'general' is
// cross-cutting knowledge (DPDPA basics, Indian contract law) shared by all.
//
// The isolation guarantee lives entirely in verticalScope(): creator and startup
// each co-retrieve only their own chunks + 'general', so they can NEVER see each
// other's corpus. Everything else (routes, pipeline, admin) just reuses these
// constants — no vertical string is hardcoded anywhere else.

export type Vertical = "creator" | "startup" | "litigation" | "general";

export const VERTICALS: Vertical[] = ["creator", "startup", "litigation", "general"];

export function isVertical(v: string | null | undefined): v is Vertical {
  return !!v && (VERTICALS as string[]).includes(v);
}

// Retrieval scope: what a given analysis vertical is allowed to read.
// Own vertical + 'general'. Querying 'general' itself reads only 'general'.
export function verticalScope(v: Vertical): Vertical[] {
  return v === "general" ? ["general"] : [v, "general"];
}
