/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    async rewrites() {
      return [
        {
          source: '/token/:id',
          destination: '/token/[id]',
        },
      ];
    },
  };
  
  export default nextConfig;