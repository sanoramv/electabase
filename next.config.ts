import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        // Supabase Storage — politician photos and document attachments
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        // Lok Sabha official portal photos
        protocol: "https",
        hostname: "loksabha.nic.in",
      },
      {
        // Rajya Sabha official portal photos
        protocol: "https",
        hostname: "rajyasabha.nic.in",
      },
      {
        // ECI portal photos
        protocol: "https",
        hostname: "www.eci.gov.in",
      },
    ],
  },
};

export default nextConfig;
