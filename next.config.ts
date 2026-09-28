import type { NextConfig } from "next";

const remotePatterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [
  {
    protocol: "https",
    hostname: "thenoveltyprints.com",
  },
  {
    protocol: "https",
    hostname: "www.thenoveltyprints.com",
  },
  {
    protocol: "http",
    hostname: "localhost",
  },
  {
    protocol: "http",
    hostname: "127.0.0.1",
  },
];

if (process.env.STORAGE_PUBLIC_URL) {
  try {
    const storageUrl = new URL(process.env.STORAGE_PUBLIC_URL);
    if (storageUrl.protocol === "https:") {
      remotePatterns.push({
        protocol: "https",
        hostname: storageUrl.hostname,
      });
    }
  } catch {
    // Invalid storage URL will be surfaced by the affected image instead of opening all HTTPS hosts.
  }
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
