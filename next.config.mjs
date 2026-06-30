/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@anthropic-ai/sdk", "pdf-parse", "mammoth"],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
