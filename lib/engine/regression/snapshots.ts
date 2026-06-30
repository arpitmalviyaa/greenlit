import { createHash } from "crypto";
import { readDocxParts } from "../docx/package";
import { validateExportedDocx } from "../validation/compatibility";

export interface Snapshot {
  source_name: string;
  part_hashes: Record<string, string>;
  feature_counts: Record<string, number>;
  package_hash: string;
}

export interface SnapshotDiff {
  source_name: string;
  passed: boolean;
  added_parts: string[];
  removed_parts: string[];
  changed_parts: string[];
  previous_feature_counts: Record<string, number>;
  current_feature_counts: Record<string, number>;
}

const VOLATILE_ATTRIBUTES = ["w:date", "w14:paraId", "w14:textId", "w:rsidR", "w:rsidRDefault", "w:rsidP"];

export class SnapshotComparator {
  snapshot(docx: Buffer, sourceName: string): Snapshot {
    const parts = readDocxParts(docx);
    const partHashes = Object.fromEntries(
      Array.from(parts.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([name, content]) => [
        name,
        sha256(canonicalPart(name, content)),
      ])
    );
    const featureCounts = validateExportedDocx(docx, { sourceName }).feature_counts;
    return {
      source_name: sourceName,
      part_hashes: partHashes,
      feature_counts: featureCounts,
      package_hash: sha256(Buffer.from(JSON.stringify(partHashes))),
    };
  }

  compare(previous: Snapshot, current: Snapshot): SnapshotDiff {
    const previousParts = new Set(Object.keys(previous.part_hashes));
    const currentParts = new Set(Object.keys(current.part_hashes));
    const changed = Array.from(previousParts)
      .filter((name) => currentParts.has(name) && previous.part_hashes[name] !== current.part_hashes[name])
      .sort();
    return {
      source_name: current.source_name,
      passed: previous.package_hash === current.package_hash && JSON.stringify(previous.feature_counts) === JSON.stringify(current.feature_counts),
      added_parts: Array.from(currentParts).filter((name) => !previousParts.has(name)).sort(),
      removed_parts: Array.from(previousParts).filter((name) => !currentParts.has(name)).sort(),
      changed_parts: changed,
      previous_feature_counts: previous.feature_counts,
      current_feature_counts: current.feature_counts,
    };
  }
}

function canonicalPart(name: string, content: Buffer): Buffer {
  if (!name.endsWith(".xml") && !name.endsWith(".rels")) return content;
  let xml = content.toString("utf8").replace(/\s+/g, " ").trim();
  for (const attribute of VOLATILE_ATTRIBUTES) {
    xml = xml.replace(new RegExp(`\\s${attribute}="[^"]*"`, "g"), "");
  }
  return Buffer.from(xml);
}

function sha256(content: Buffer): string {
  return createHash("sha256").update(content).digest("hex");
}
