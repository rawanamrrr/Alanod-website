/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Configure page extensions to include API routes
  pageExtensions: ['tsx', 'ts', 'jsx', 'js', 'mjs'],
  
  // Enable server actions for form submissions
  experimental: {
    serverActions: {
      bodySizeLimit: '25mb', // Increase body size limit for server actions
    },
    // Enable server components
    // MongoDB removed - using Supabase now
  },

  // Configure images
  images: {
    unoptimized: false,
    dangerouslyAllowSVG: true,  // ✅ enable SVG support
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "via.placeholder.com" },
      { protocol: "https", hostname: "jwbonsxidrbmuiopjafj.supabase.co" },
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
    // Disable image optimization for local images to prevent caching issues
    loader: 'default',
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Configure API routes (Note: In Next.js 13+ App Router, API routes don't use this config)
  // This is kept for backwards compatibility but has no effect in App Router

  // Enable React Strict Mode
  reactStrictMode: true,
  
  // Enable SWC minification
  swcMinify: true,
  
  // Configure webpack
  webpack: (config, { isServer }) => {
    // Important: return the modified config
    if (!isServer) {
      // Don't resolve 'fs' module on the client to prevent errors
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        dns: false,
        child_process: false,
      }
    }
    
    return config
  },
}

export default nextConfig
