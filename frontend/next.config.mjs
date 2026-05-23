/** @type {import('next').NextConfig} */
const nextConfig = {
  // Proxy /api/* → backend en localhost:3001 durante desarrollo.
  // Evita CORS y permite llamar /api/* desde el mismo origen (localhost:3000).
  async rewrites() {
    return [
      {
        source:      '/api/:path*',
        destination: 'http://localhost:3001/api/:path*',
      },
    ];
  },
};

export default nextConfig;
