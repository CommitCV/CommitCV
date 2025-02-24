import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    webpack: (config) => {
      config.resolve.alias.canvas = false;

      return config;
    },
    experimental: {
        turbo: {
            resolveAlias: {
                underscore: 'lodash',
                mocha: { browser: 'mocha/browser-entry.js' },
            },
        },
    },
};

export default nextConfig;
