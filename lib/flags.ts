// Feature flags for the v1 surface (see FEATURE_FLAGS.md).
// Flags gate PAGES only — backend API routes stay live so nothing breaks
// for data already in the DB. Flip to true to restore a feature.
export const FLAGS = {
  sendScanner: false,
  dealRooms: false, // replaced by the lightweight Deals list
  termSheets: false,
  scopeMonitor: false,
  meetingCounsel: false,
  delivery: false,
  timeline: false,
  legalPlaybook: false,
  crossReference: false,
  proofVault: false,
  // Pipeline flag (not a page): grounded statutory compliance check on every
  // analysis. OFF until the authority corpus is populated — flipping it ON with
  // an empty corpus just returns "no authority matched" everywhere.
  complianceCheck: false,
} as const;

export type FlagKey = keyof typeof FLAGS;
