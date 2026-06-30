import { readDocxParts, writeDocxParts, type DocxParts } from "../docx/package";

export type SupportedEditor = "word_desktop" | "word_online" | "libreoffice" | "google_docs";
export type EditorStatus = "not_run" | "passed" | "failed";
export type IssueSeverity = "error" | "warning";

export interface ValidationIssue {
  code: string;
  message: string;
  severity: IssueSeverity;
  part?: string;
}

export interface EditorValidation {
  editor: SupportedEditor;
  status: EditorStatus;
  detail: string;
  evidence_id?: string;
}

export interface CompatibilityReport {
  source_name: string;
  valid: boolean;
  package_valid: boolean;
  ooxml_valid: boolean;
  xml_schema_valid: boolean;
  round_trip_valid: boolean;
  issues: ValidationIssue[];
  feature_counts: Record<string, number>;
  editor_validations: EditorValidation[];
}

export const SUPPORTED_EDITORS: SupportedEditor[] = ["word_desktop", "word_online", "libreoffice", "google_docs"];

type ExternalEditorResults = Partial<Record<SupportedEditor, { passed: boolean; detail?: string; evidence_id?: string }>>;

export function validateExportedDocx(
  docx: Buffer,
  options: { sourceName?: string; externalEditorResults?: ExternalEditorResults } = {}
): CompatibilityReport {
  const sourceName = options.sourceName ?? "export.docx";
  const issues: ValidationIssue[] = [];
  let parts: DocxParts = new Map();

  try {
    parts = readDocxParts(docx);
  } catch (error) {
    issues.push(issue("INVALID_ZIP", error instanceof Error ? error.message : "DOCX is not a readable ZIP package"));
  }

  if (parts.size) {
    issues.push(...validatePackageParts(parts));
  }

  const featureCounts = parts.size ? countFeatures(parts) : {};
  let roundTripValid = false;
  if (parts.size) {
    try {
      const roundTrip = readDocxParts(writeDocxParts(parts));
      roundTripValid = samePartSet(parts, roundTrip);
      if (!roundTripValid) issues.push(issue("ROUND_TRIP_PART_LOSS", "ZIP round trip changed the package part set"));
    } catch (error) {
      issues.push(issue("ROUND_TRIP_FAILED", error instanceof Error ? error.message : "DOCX round trip failed"));
    }
  }

  const errorFree = !issues.some((item) => item.severity === "error");
  return {
    source_name: sourceName,
    valid: parts.size > 0 && errorFree && roundTripValid,
    package_valid: parts.size > 0 && !issues.some((item) => item.code.startsWith("ZIP") || item.code === "INVALID_ZIP"),
    ooxml_valid: !issues.some((item) => item.severity === "error" && item.code !== "XML_PARSE_ERROR"),
    xml_schema_valid: !issues.some((item) => item.code === "XML_PARSE_ERROR" || item.code.endsWith("_MISSING") || item.code.endsWith("_INVALID")),
    round_trip_valid: roundTripValid,
    issues,
    feature_counts: featureCounts,
    editor_validations: editorValidations(options.externalEditorResults ?? {}),
  };
}

function validatePackageParts(parts: DocxParts): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const [name, content] of Array.from(parts.entries())) {
    if ((name.endsWith(".xml") || name.endsWith(".rels")) && !looksLikeXml(content)) {
      issues.push(issue("XML_PARSE_ERROR", "XML part is not well formed enough for compatibility validation", name));
    }
  }

  if (!parts.has("[Content_Types].xml")) issues.push(issue("CONTENT_TYPES_MISSING", "DOCX package is missing [Content_Types].xml"));
  if (!parts.has("_rels/.rels")) issues.push(issue("ROOT_RELS_MISSING", "DOCX package is missing _rels/.rels"));
  if (!parts.has("word/document.xml")) issues.push(issue("DOCUMENT_XML_MISSING", "DOCX package is missing word/document.xml"));

  const contentTypes = text(parts, "[Content_Types].xml");
  if (contentTypes && !contentTypes.includes('PartName="/word/document.xml"')) {
    issues.push(issue("DOCUMENT_CONTENT_TYPE_INVALID", "word/document.xml content type override is missing", "[Content_Types].xml"));
  }

  for (const [name, content] of Array.from(parts.entries())) {
    if (!name.endsWith(".rels")) continue;
    for (const target of relationshipTargets(content.toString("utf8"))) {
      if (target.external || target.target.startsWith("#")) continue;
      const resolved = resolveRelationshipTarget(name, target.target);
      if (!parts.has(resolved)) issues.push(issue("REL_TARGET_MISSING", `Relationship target is missing: ${target.target}`, name));
    }
  }

  const documentXml = text(parts, "word/document.xml");
  if (documentXml) {
    if (!visibleText(documentXml) && !documentXml.includes("<w:tbl")) {
      issues.push(issue("EMPTY_DOCUMENT", "word/document.xml contains no visible text or table content", "word/document.xml"));
    }
    const starts = new Set(attributeValues(documentXml, "w:bookmarkStart", "w:id"));
    const ends = new Set(attributeValues(documentXml, "w:bookmarkEnd", "w:id"));
    const missing = Array.from(starts).filter((id) => id && !ends.has(id));
    if (missing.length) issues.push(issue("BOOKMARK_END_MISSING", `Bookmark ids lack matching ends: ${missing.slice(0, 10).join(", ")}`, "word/document.xml"));
    if (hasTrackChanges(documentXml) && text(parts, "word/settings.xml") && !text(parts, "word/settings.xml")?.includes("<w:trackRevisions")) {
      issues.push(issue("TRACK_REVISIONS_DISABLED", "Track changes exist but w:trackRevisions is not enabled", "word/settings.xml", "warning"));
    }
    if (documentXml.includes("<w:commentReference") && !parts.has("word/comments.xml")) {
      issues.push(issue("COMMENTS_PART_MISSING", "Document references comments but word/comments.xml is missing", "word/document.xml"));
    }
  }

  return issues;
}

export function countFeatures(parts: DocxParts): Record<string, number> {
  const counts: Record<string, number> = {};
  const add = (name: string, value: number) => { if (value) counts[name] = (counts[name] ?? 0) + value; };

  for (const [name, content] of Array.from(parts.entries())) {
    if (!/^word\/(document|header\d+|footer\d+)\.xml$/.test(name)) continue;
    const xml = content.toString("utf8");
    add("paragraphs", matches(xml, /<w:p(?:\s|>)/g));
    add("tables", matches(xml, /<w:tbl(?:\s|>)/g));
    add("merged_cells", matches(xml, /<w:(?:gridSpan|vMerge)(?:\s|\/?>)/g));
    add("lists", matches(xml, /<w:numPr(?:\s|>)/g));
    add("nested_numbering", Array.from(xml.matchAll(/<w:ilvl[^>]*w:val="([^"]+)"/g)).filter((match) => match[1] !== "0").length);
    add("hyperlinks", matches(xml, /<w:hyperlink(?:\s|>)/g));
    add("bookmarks", matches(xml, /<w:bookmarkStart(?:\s|>)/g));
    add("cross_references", matches(xml, /<w:fldSimple[^>]*w:instr="[^"]*\bREF\b/g));
    add("fields", matches(xml, /<w:(?:fldSimple|instrText)(?:\s|>)/g));
    add("content_controls", matches(xml, /<w:sdt(?:\s|>)/g));
    add("section_breaks", matches(xml, /<w:sectPr(?:\s|\/?>)/g));
    add("page_breaks", matches(xml, /<w:br[^>]*w:type="page"/g));
    add("images", matches(xml, /<a:blip[^>]*r:embed="/g));
    add("comments", matches(xml, /<w:commentReference(?:\s|\/?>)/g));
    add("track_changes", matches(xml, /<w:(?:ins|del|moveFrom|moveTo|pPrChange)(?:\s|>)/g));
  }

  const comments = text(parts, "word/comments.xml");
  if (comments) counts.comments = Math.max(counts.comments ?? 0, matches(comments, /<w:comment(?:\s|>)/g));
  const footnotes = text(parts, "word/footnotes.xml");
  if (footnotes) add("footnotes", matches(footnotes, /<w:footnote(?:\s|>)/g));
  const endnotes = text(parts, "word/endnotes.xml");
  if (endnotes) add("endnotes", matches(endnotes, /<w:endnote(?:\s|>)/g));
  const styles = text(parts, "word/styles.xml");
  if (styles) {
    counts.styles = matches(styles, /<w:style(?:\s|>)/g);
    add("custom_styles", matches(styles, /<w:style[^>]*w:customStyle="1"/g));
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

function editorValidations(results: ExternalEditorResults): EditorValidation[] {
  return SUPPORTED_EDITORS.map((editor) => {
    const result = results[editor];
    if (!result) return { editor, status: "not_run", detail: "No captured editor import/export evidence was supplied" };
    return {
      editor,
      status: result.passed ? "passed" : "failed",
      detail: result.detail ?? (result.passed ? "External editor validation passed" : "External editor validation failed"),
      evidence_id: result.evidence_id,
    };
  });
}

function relationshipTargets(xml: string): Array<{ target: string; external: boolean }> {
  return Array.from(xml.matchAll(/<Relationship\b([^>]*)\/?>/g)).map((match) => {
    const attrs = match[1];
    return {
      target: attr(attrs, "Target") ?? "",
      external: attr(attrs, "TargetMode") === "External",
    };
  }).filter((item) => item.target);
}

function resolveRelationshipTarget(relsName: string, target: string): string {
  if (relsName === "_rels/.rels") return target.replace(/^\/+/, "");
  const base = relsName.replace(/\/_rels\/[^/]+\.rels$/, "");
  return normalizePath(`${base}/${target}`);
}

function normalizePath(path: string): string {
  const out: string[] = [];
  for (const part of path.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") out.pop();
    else out.push(part);
  }
  return out.join("/");
}

function attr(attrs: string, name: string): string | undefined {
  return attrs.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];
}

function attributeValues(xml: string, tag: string, attribute: string): string[] {
  return Array.from(xml.matchAll(new RegExp(`<${tag}\\b([^>]*)>`, "g"))).map((match) => attr(match[1], attribute)).filter(Boolean) as string[];
}

function issue(code: string, message: string, part?: string, severity: IssueSeverity = "error"): ValidationIssue {
  return { code, message, severity, part };
}

function text(parts: DocxParts, name: string): string | undefined {
  return parts.get(name)?.toString("utf8");
}

function matches(value: string, pattern: RegExp): number {
  return value.match(pattern)?.length ?? 0;
}

function visibleText(xml: string): string {
  return Array.from(xml.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)).map((match) => match[1]).join("").trim();
}

function looksLikeXml(content: Buffer): boolean {
  const value = content.toString("utf8").trim();
  return value.startsWith("<") && value.endsWith(">");
}

function hasTrackChanges(xml: string): boolean {
  return /<w:(?:ins|del|moveFrom|moveTo|pPrChange)(?:\s|>)/.test(xml);
}

function samePartSet(a: DocxParts, b: DocxParts): boolean {
  return a.size === b.size && Array.from(a.keys()).every((name) => b.has(name));
}
