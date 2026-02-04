/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
      },
    ],
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  },
  // Use 'standalone' for Docker/server deployments, 'export' for S3/static hosting
  output: process.env.NEXT_EXPORT ? 'export' : 'standalone',
  // Ignore .env file if it doesn't exist or has permission issues
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  // Trailing slash for S3 compatibility
  trailingSlash: process.env.NEXT_EXPORT ? true : false,
};

module.exports = nextConfig;
