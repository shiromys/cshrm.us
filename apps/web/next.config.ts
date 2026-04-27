import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone", // Required for Railway / Docker deployment
  serverExternalPackages: ["pg-boss", "postgres", "drizzle-orm"],
};

export default nextConfig;
