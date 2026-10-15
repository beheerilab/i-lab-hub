import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // De losse HTML-tools (src/tools-html) worden met fs gelezen door
  // /api/tools/[naam]; zonder deze regel neemt de deploy ze niet mee.
  outputFileTracingIncludes: {
    "/api/tools/[naam]": ["./src/tools-html/**/*"],
    "/melden": ["./src/tools-html/**/*"],
  },
};

export default nextConfig;
