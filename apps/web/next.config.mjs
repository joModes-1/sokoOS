/** @type {import('next').NextConfig} */
const nextConfig = {
  typedRoutes: false,
  images: { remotePatterns: [] },
  transpilePackages: ['@sokoos/shared'],
  webpack: (config) => {
    // shared package uses ESM-style './x.js' imports that point at .ts sources
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias ?? {}),
      '.js': ['.ts', '.tsx', '.js'],
    };
    return config;
  },

  // The specification (docs/11-ui-ux-specification.md) defines no "section index" screens:
  // every screen is concrete (e.g. /catalogue/products). The sidebar now links straight to the
  // real screens (see lib/routes.ts); these redirects keep older/bookmarked section URLs
  // working instead of returning 404.
  async redirects() {
    return [
      { source: '/catalogue', destination: '/catalogue/products', permanent: false },
      { source: '/inventory', destination: '/inventory/balances', permanent: false },
      { source: '/purchasing', destination: '/purchasing/purchase-orders', permanent: false },
      { source: '/finance', destination: '/finance/payments', permanent: false },
      { source: '/reports', destination: '/reports/sales', permanent: false },
      { source: '/settings', destination: '/settings/business', permanent: false },
    ];
  },
};
export default nextConfig;

