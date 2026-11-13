/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    // Native / heavy Node packages must be loaded by Node at runtime instead of being bundled.
    serverComponentsExternalPackages: ['@huggingface/transformers', 'onnxruntime-node', 'sharp', 'pdf-parse', 'pg'],
    // Resume uploads go through Server Actions (default limit is 1 MB).
    serverActions: { bodySizeLimit: '6mb' },
  },
};

export default nextConfig;
