const nextConfig = {
  reactStrictMode: true,

  async rewrites() {
    return [
      { source: "/dishes/:path*", destination: "/api/dishes/:path*" },
      { source: "/dishes", destination: "/api/dishes" },
    ];
  },
};
export default nextConfig;
