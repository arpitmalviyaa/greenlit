// Server-only. Claude-vision transcription for images and scanned PDFs — the
// OCR tier for the one-click Verify flow. Uses the existing Anthropic key; no
// Tesseract or new OCR dependency. Page-by-page transcription is native: Claude
// reads a base64 PDF document block directly; multi-page contract photos come in
// as ordered image blocks.

import { getAnthropicClient } from "@/lib/anthropic/client";
import { MODELS } from "@/lib/anthropic/utils";

export const PAGE_CAP = 40;

// Anthropic vision accepts these image media types. HEIC is NOT supported and
// there is no transcoder installed tonight.
// ponytail: HEIC → add heic-convert (Week-1) to transcode to JPEG before send.
const VISION_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

const TRANSCRIBE =
  "Transcribe ALL text in this document verbatim, preserving clause numbering, " +
  "headings, and paragraph order. If there are multiple pages, transcribe each in " +
  "order and separate them with a line '--- page N ---'. Output only the transcribed " +
  "text, no commentary.";

export function isVisionImage(mimeType: string, fileName: string): boolean {
  return VISION_IMAGE_TYPES.has(mimeType) || /\.(jpe?g|png|gif|webp)$/i.test(fileName);
}

function imageMediaType(mimeType: string, fileName: string): string {
  if (VISION_IMAGE_TYPES.has(mimeType)) return mimeType;
  if (/\.png$/i.test(fileName)) return "image/png";
  if (/\.gif$/i.test(fileName)) return "image/gif";
  if (/\.webp$/i.test(fileName)) return "image/webp";
  return "image/jpeg";
}

// Transcribe a single image (one page / one photo).
export async function transcribeImage(
  buffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<{ text: string; error?: string }> {
  if (/\.heic$/i.test(fileName) || mimeType === "image/heic") {
    return { text: "", error: "HEIC images aren't supported yet — please upload a JPG or PNG." };
  }
  try {
    const anthropic = getAnthropicClient();
    const resp = await anthropic.messages.create({
      model: MODELS.SONNET,
      max_tokens: 8000,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: imageMediaType(mimeType, fileName) as "image/jpeg", data: buffer.toString("base64") } },
          { type: "text", text: TRANSCRIBE },
        ],
      }],
    });
    const text = resp.content.find((b) => b.type === "text");
    return { text: text && text.type === "text" ? text.text.trim() : "" };
  } catch (err) {
    return { text: "", error: err instanceof Error ? err.message : "vision transcription failed" };
  }
}

// Transcribe a scanned PDF via Claude's native PDF document block (all pages).
export async function transcribeScannedPdf(
  buffer: Buffer,
  pageCount?: number
): Promise<{ text: string; error?: string }> {
  if (pageCount && pageCount > PAGE_CAP) {
    return { text: "", error: `Document has ${pageCount} pages; the limit is ${PAGE_CAP}.` };
  }
  try {
    const anthropic = getAnthropicClient();
    const resp = await anthropic.messages.create({
      model: MODELS.SONNET,
      max_tokens: 8000,
      messages: [{
        role: "user",
        content: [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: buffer.toString("base64") } },
          { type: "text", text: TRANSCRIBE },
        ],
      }],
    });
    const text = resp.content.find((b) => b.type === "text");
    return { text: text && text.type === "text" ? text.text.trim() : "" };
  } catch (err) {
    return { text: "", error: err instanceof Error ? err.message : "PDF vision transcription failed" };
  }
}
