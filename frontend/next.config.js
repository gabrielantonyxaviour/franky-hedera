/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['via.placeholder.com'],
  },
  webpack: (config, { isServer }) => {
    // Fixes npm packages that depend on `fs` module
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false
      };
      
      // Use mock for pino
      config.resolve.alias = {
        ...config.resolve.alias,
        'pino': require.resolve('./src/lib/pino-mock.js'),
        'pino-pretty': require.resolve('./src/lib/pino-mock.js')
      };
    }
    
    return config;
  },
}

module.exports = nextConfig 