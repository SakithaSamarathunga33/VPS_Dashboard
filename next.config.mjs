/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [
    'better-sqlite3',
    'dockerode',
    'systeminformation',
  ],
}

export default nextConfig
