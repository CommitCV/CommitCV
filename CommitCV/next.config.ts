import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    webpack: (config, {dev}) => {
      config.resolve.alias.canvas = false;
        if (dev) {
            config.devtool = 'source-map';
        }
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
