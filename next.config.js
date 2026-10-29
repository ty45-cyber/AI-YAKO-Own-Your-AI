/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: [
      'better-sqlite3',
      '@qvac/sdk',
      '@tetherto/wdk',
      '@tetherto/wdk-wallet-evm',
    ],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : [config.externals]),
        '@qvac/sdk',
        '@tetherto/wdk',
        '@tetherto/wdk-wallet-evm',
        'better-sqlite3',
      ];
    }
    return config;
  },
};

module.exports = nextConfig;
