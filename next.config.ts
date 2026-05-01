import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "playwright",
    "@axe-core/playwright",
    "axe-core",
    "lighthouse",
    "chrome-launcher",
  ],
};

export default nextConfig;
