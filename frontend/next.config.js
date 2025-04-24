/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['via.placeholder.com'],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  transpilePackages: ['@walletconnect', 'pino'],
  webpack: (config, { isServer }) => {
    // Fixes npm packages that depend on `fs` module
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: require.resolve('crypto-browserify'),
        stream: require.resolve('stream-browserify'),
        url: require.resolve('url'),
        zlib: require.resolve('browserify-zlib'),
        http: require.resolve('stream-http'),
        https: require.resolve('https-browserify'),
        assert: require.resolve('assert'),
        os: require.resolve('os-browserify'),
        path: require.resolve('path-browserify'),
      };

      // Use minimal pino stub
      config.resolve.alias = {
        ...config.resolve.alias,
        'pino': require.resolve('./src/lib/pino-stub.js'),
        'pino-pretty': require.resolve('./src/lib/pino-stub.js')
      };
    }
    
    // Required for REOWN AppKit to work properly
    config.externals = [
      ...(config.externals || []),
      'pino-pretty',
      'lokijs',
      'encoding'
    ].filter(Boolean);
    
    return config;
  },
}

module.exports = nextConfig 