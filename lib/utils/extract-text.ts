// Server-only. Extracts plain text from PDF, DOCX, and image buffers. Digital
// PDFs/DOCX use native parsers; scanned PDFs and photos fall back to Claude
// vision transcription (the one-click Verify OCR tier).

export async function extractTextFromBuffer(
  buffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<{ text: string; html?: string; error?: string }> {
  try {
    if (mimeType === "application/pdf" || fileName.toLowerCase().endsWith(".pdf")) {
      return extractPdf(buffer);
    }
    if (
      mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      fileName.toLowerCase().endsWith(".docx")
    ) {
      return extractDocx(buffer);
    }
    // Plain text (e.g. a blog/article link already stripped to text by the caller).
    if (mimeType.startsWith("text/") || /\.(txt|md|markdown)$/i.test(fileName)) {
      const text = buffer.toString("utf8").trim();
      return text ? { text } : { text: "", error: "empty text" };
    }
    // Photo of a contract (or HEIC, which returns a friendly "use JPG" error).
    const { isVisionImage, transcribeImage } = await import("./vision-extract.ts");
    if (isVisionImage(mimeType, fileName) || /\.heic$/i.test(fileName) || mimeType === "image/heic") {
      return transcribeImage(buffer, mimeType, fileName);
    }
    return { text: "", error: `Unsupported file type: ${mimeType}` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown extraction error";
    return { text: "", error: msg };
  }
}

async function extractPdf(buffer: Buffer): Promise<{ text: string; html?: string; error?: string }> {
  try {
    // Dynamic import avoids Next.js edge runtime issues
    const pdfModule = await import("pdf-parse");
    type PdfFn = (buf: Buffer, opts?: { max?: number }) => Promise<{ text: string; numpages?: number }>;
    type PdfV2 = new (opts: { data: Uint8Array }) => { getText(): Promise<{ text: string; total?: number }> };
    const mod = ((pdfModule as { default?: unknown }).default ?? pdfModule) as Record<string, unknown>;
    let text = "";
    let numpages: number | undefined;
    const PDFParse = (mod.PDFParse ?? (pdfModule as Record<string, unknown>).PDFParse) as PdfV2 | undefined;
    if (PDFParse) {
      // pdf-parse >=2: class API
      const result = await new PDFParse({ data: new Uint8Array(buffer) }).getText();
      text = result.text?.trim() ?? "";
      numpages = result.total;
    } else {
      // pdf-parse 1.x: callable module
      const result = await (mod as unknown as PdfFn)(buffer, { max: 0 });
      text = result.text?.trim() ?? "";
      numpages = result.numpages;
    }
    if (text) return { text };
    // No embedded text → scanned PDF. Fall back to Claude vision (page-capped).
    const { transcribeScannedPdf } = await import("./vision-extract.ts");
    return transcribeScannedPdf(buffer, numpages);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "PDF parsing failed";
    return { text: "", error: msg };
  }
}

async function extractDocx(buffer: Buffer): Promise<{ text: string; html?: string; error?: string }> {
  try {
    const mammoth = await import("mammoth");
    const [raw, rendered] = await Promise.all([
      mammoth.extractRawText({ buffer }),
      mammoth.convertToHtml({ buffer }),
    ]);
    const text = raw.value?.trim() ?? "";
    if (!text) return { text: "", error: "DOCX contained no extractable text" };
    return { text, html: sanitiseMammothHtml(rendered.value) };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "DOCX parsing failed";
    return { text: "", error: msg };
  }
}

function sanitiseMammothHtml(html: string): string {
  // ponytail: Mammoth generates a small, predictable tag set. If richer Word
  // fidelity is needed later, replace this allowlist with a full document renderer.
  return html
    .replace(/<(?!\/?(?:p|h[1-6]|ol|ul|li|strong|em|table|thead|tbody|tr|th|td|br)\b)[^>]*>/gi, "")
    .replace(/<(\/?(?:p|h[1-6]|ol|ul|li|strong|em|table|thead|tbody|tr|th|td|br))\b[^>]*>/gi, "<$1>");
}
