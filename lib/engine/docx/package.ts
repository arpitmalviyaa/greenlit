import { deflateRawSync, inflateRawSync } from "zlib";

export type DocxParts = Map<string, Buffer>;
export interface DocxValidationReport {
  valid: boolean;
  issues: Array<{ code: string; detail?: string }>;
  part_count: number;
  uncompressed_bytes: number;
}

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_DIRECTORY_SIGNATURE = 0x02014b50;
const LOCAL_FILE_SIGNATURE = 0x04034b50;
const MAX_ZIP_ENTRIES = 2048;
const MAX_UNCOMPRESSED_BYTES = 80 * 1024 * 1024;
const MAX_COMPRESSION_RATIO = 100;

const crcTable = new Uint32Array(256).map((_, idx) => {
  let value = idx;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

export function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (let idx = 0; idx < buffer.length; idx += 1) crc = crcTable[(crc ^ buffer[idx]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

export function readDocxParts(docx: Buffer): DocxParts {
  const eocdOffset = findEndOfCentralDirectory(docx);
  if (eocdOffset < 0) throw new Error("INVALID_DOCX_ZIP");

  const totalEntries = docx.readUInt16LE(eocdOffset + 10);
  const centralDirectoryOffset = docx.readUInt32LE(eocdOffset + 16);
  if (totalEntries > MAX_ZIP_ENTRIES) throw new Error("ZIP_TOO_MANY_ENTRIES");
  if (centralDirectoryOffset >= docx.length) throw new Error("INVALID_CENTRAL_DIRECTORY_OFFSET");
  const parts: DocxParts = new Map();
  let cursor = centralDirectoryOffset;
  let uncompressedBytes = 0;

  for (let idx = 0; idx < totalEntries; idx += 1) {
    if (cursor + 46 > docx.length) throw new Error("TRUNCATED_CENTRAL_DIRECTORY");
    if (docx.readUInt32LE(cursor) !== CENTRAL_DIRECTORY_SIGNATURE) throw new Error("INVALID_CENTRAL_DIRECTORY");
    const method = docx.readUInt16LE(cursor + 10);
    const expectedCrc = docx.readUInt32LE(cursor + 16);
    const compressedSize = docx.readUInt32LE(cursor + 20);
    const uncompressedSize = docx.readUInt32LE(cursor + 24);
    const fileNameLength = docx.readUInt16LE(cursor + 28);
    const extraLength = docx.readUInt16LE(cursor + 30);
    const commentLength = docx.readUInt16LE(cursor + 32);
    const localHeaderOffset = docx.readUInt32LE(cursor + 42);
    const name = docx.subarray(cursor + 46, cursor + 46 + fileNameLength).toString("utf8");
    if (cursor + 46 + fileNameLength + extraLength + commentLength > docx.length) throw new Error("TRUNCATED_CENTRAL_DIRECTORY");
    if (isUnsafeZipName(name)) throw new Error(`UNSAFE_ZIP_PATH:${name}`);
    if (compressedSize > 0 && uncompressedSize / compressedSize > MAX_COMPRESSION_RATIO) throw new Error(`ZIP_COMPRESSION_RATIO:${name}`);
    uncompressedBytes += uncompressedSize;
    if (uncompressedBytes > MAX_UNCOMPRESSED_BYTES) throw new Error("ZIP_UNCOMPRESSED_TOO_LARGE");

    if (!name.endsWith("/")) {
      const content = readLocalPart(docx, localHeaderOffset, method, compressedSize);
      if (content.length !== uncompressedSize) throw new Error(`ZIP_SIZE_MISMATCH:${name}`);
      if (crc32(content) !== expectedCrc) throw new Error(`ZIP_CRC_MISMATCH:${name}`);
      parts.set(name, content);
    }
    cursor += 46 + fileNameLength + extraLength + commentLength;
  }

  return parts;
}

export function validateDocxPackage(docx: Buffer): DocxValidationReport {
  const issues: DocxValidationReport["issues"] = [];
  let parts: DocxParts;
  try {
    parts = readDocxParts(docx);
  } catch (error) {
    return {
      valid: false,
      issues: [{ code: error instanceof Error ? error.message : "DOCX_PARSE_FAILED" }],
      part_count: 0,
      uncompressed_bytes: 0,
    };
  }
  for (const part of ["[Content_Types].xml", "_rels/.rels", "word/document.xml"]) {
    if (!parts.has(part)) issues.push({ code: "MISSING_REQUIRED_PART", detail: part });
  }
  if (!looksLikeXml(parts.get("[Content_Types].xml"))) issues.push({ code: "INVALID_CONTENT_TYPES_XML" });
  if (!looksLikeXml(parts.get("word/document.xml"))) issues.push({ code: "INVALID_DOCUMENT_XML" });
  return {
    valid: issues.length === 0,
    issues,
    part_count: parts.size,
    uncompressed_bytes: Array.from(parts.values()).reduce((sum, part) => sum + part.length, 0),
  };
}

export function writeDocxParts(parts: DocxParts): Buffer {
  const localChunks: Buffer[] = [];
  const centralChunks: Buffer[] = [];
  let offset = 0;

  for (const [name, content] of Array.from(parts.entries()).sort(([a], [b]) => a.localeCompare(b))) {
    const nameBytes = Buffer.from(name, "utf8");
    const compressed = deflateRawSync(content);
    const crc = crc32(content);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(LOCAL_FILE_SIGNATURE, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(content.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    local.writeUInt16LE(0, 28);
    localChunks.push(local, nameBytes, compressed);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(CENTRAL_DIRECTORY_SIGNATURE, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(content.length, 24);
    central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    centralChunks.push(central, nameBytes);

    offset += local.length + nameBytes.length + compressed.length;
  }

  const centralDirectoryOffset = offset;
  const centralDirectory = Buffer.concat(centralChunks);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(EOCD_SIGNATURE, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(parts.size, 8);
  eocd.writeUInt16LE(parts.size, 10);
  eocd.writeUInt32LE(centralDirectory.length, 12);
  eocd.writeUInt32LE(centralDirectoryOffset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localChunks, centralDirectory, eocd]);
}

function findEndOfCentralDirectory(docx: Buffer): number {
  const min = Math.max(0, docx.length - 65557);
  for (let offset = docx.length - 22; offset >= min; offset -= 1) {
    if (docx.readUInt32LE(offset) === EOCD_SIGNATURE) return offset;
  }
  return -1;
}

function readLocalPart(docx: Buffer, offset: number, method: number, compressedSize: number): Buffer {
  if (offset + 30 > docx.length) throw new Error("TRUNCATED_LOCAL_FILE_HEADER");
  if (docx.readUInt32LE(offset) !== LOCAL_FILE_SIGNATURE) throw new Error("INVALID_LOCAL_FILE_HEADER");
  const fileNameLength = docx.readUInt16LE(offset + 26);
  const extraLength = docx.readUInt16LE(offset + 28);
  const dataStart = offset + 30 + fileNameLength + extraLength;
  if (dataStart + compressedSize > docx.length) throw new Error("TRUNCATED_ZIP_ENTRY");
  const data = docx.subarray(dataStart, dataStart + compressedSize);
  if (method === 0) return Buffer.from(data);
  if (method === 8) return inflateRawSync(data);
  throw new Error(`UNSUPPORTED_ZIP_COMPRESSION:${method}`);
}

export function getXmlPart(parts: DocxParts, name: string): string {
  const content = parts.get(name);
  if (!content) throw new Error(`MISSING_DOCX_PART:${name}`);
  return content.toString("utf8");
}

function isUnsafeZipName(name: string): boolean {
  return name.startsWith("/") || name.includes("\\") || name.split("/").includes("..");
}

function looksLikeXml(content: Buffer | undefined): boolean {
  if (!content?.length) return false;
  const trimmed = content.toString("utf8", 0, Math.min(content.length, 256)).trimStart();
  return trimmed.startsWith("<");
}
