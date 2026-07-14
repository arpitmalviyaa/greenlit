/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@anthropic-ai/sdk", "pdf-parse", "mammoth"],
  // pdfjs (inside pdf-parse) loads its worker via a dynamic import file
  // tracing can't see; without this, prod PDF extraction dies with
  // "Cannot find module .../pdf.worker.mjs".
  outputFileTracingIncludes: {
    "/api/counsel/upload": ["./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"],
    "/api/final-check/upload": ["./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"],
  },
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
