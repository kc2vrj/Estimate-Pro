/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  env: {
    API_URL: process.env.NODE_ENV === 'production' ? 'https://your-production-url' : 'http://localhost:8080',
  },
  // Ensure server-side rendering works properly
  serverRuntimeConfig: {
    // Will only be available on the server side
    mySecret: 'secret',
    secondSecret: process.env.SECOND_SECRET, // Pass through env variables
  },
  publicRuntimeConfig: {
    // Will be available on both server and client
    staticFolder: '/static',
  },
  // Configure custom server handling
  useFileSystemPublicRoutes: true,
}

module.exports = nextConfig
