/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allows importing SVGs as React components
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    })
    return config
  },
}

module.exports = nextConfig
