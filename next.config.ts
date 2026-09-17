import type { NextConfig } from "next";

function supabaseHostname(): string | null {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    return url ? new URL(url).hostname : null;
  } catch {
    return null;
  }
}

const supabaseHost = supabaseHostname();

const nextConfig: NextConfig = {
  // `npm run lint` runs ESLint directly (flat config, ESLint 8) and is part
  // of the required verification pipeline; Next 15's built-in `next build`
  // lint pass uses an incompatible legacy ESLint CLI integration, so it is
  // skipped here to avoid a duplicate/broken lint run during build.
  eslint: { ignoreDuringBuilds: true },
  // Minimal self-contained server output (.next/standalone) for the Windows
  // desktop launcher build (see scripts/desktop/).
  output: "standalone",
  images: {
    remotePatterns: [
      // Media uploaded to this project's Supabase Storage bucket.
      ...(supabaseHost
        ? [{ protocol: "https" as const, hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }]
        : []),
      // Seed/demo placeholder imagery only.
      { protocol: "https" as const, hostname: "images.unsplash.com" },
    ],
  },
};

export default nextConfig;
