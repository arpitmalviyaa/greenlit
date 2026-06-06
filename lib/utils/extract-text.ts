// Server-only. Extracts plain text from PDF and DOCX buffers.

export async function extractTextFromBuffer(
  buffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<{ text: string; error?: string }> {
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
    return { text: "", error: `Unsupported file type: ${mimeType}` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown extraction error";
    return { text: "", error: msg };
  }
}

async function extractPdf(buffer: Buffer): Promise<{ text: string; error?: string }> {
  try {
    // Dynamic import avoids Next.js edge runtime issues
    const pdfModule = await import("pdf-parse");
    // pdf-parse exports differ between CJS and ESM builds
    type PdfFn = (buf: Buffer, opts?: { max?: number }) => Promise<{ text: string }>;
    const pdfParse = ((pdfModule as unknown as { default: PdfFn }).default ?? pdfModule) as PdfFn;
    const result = await pdfParse(buffer, { max: 0 });
    const text = result.text?.trim() ?? "";
    if (!text) return { text: "", error: "PDF contained no extractable text (may be scanned image)" };
    return { text };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "PDF parsing failed";
    return { text: "", error: msg };
  }
}

async function extractDocx(buffer: Buffer): Promise<{ text: string; error?: string }> {
  try {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value?.trim() ?? "";
    if (!text) return { text: "", error: "DOCX contained no extractable text" };
    return { text };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "DOCX parsing failed";
    return { text: "", error: msg };
  }
}
