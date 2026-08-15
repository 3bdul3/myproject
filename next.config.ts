import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Add environment variable handling for Railway
  env: {
    AUTH_SECRET: process.env.AUTH_SECRET || "default-auth-secret-change-in-production",
  },
};

export default nextConfig;
