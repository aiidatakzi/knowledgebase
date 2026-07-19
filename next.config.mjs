/** @type {import('next').NextConfig} */
const nextConfig = {
  // Handle ESM/CJS interop for vis-network (only used client-side)
  transpilePackages: ['vis-network', 'vis-data'],
  // Webpack config for native modules
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), 'pdf-parse', 'natural'];
    }
    return config;
  },
};

export default nextConfig;