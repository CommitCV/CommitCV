import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    webpack: (config, {dev}) => {
      config.resolve.alias.canvas = false;
        if (dev) {
            config.devtool = 'source-map';
        }
      return config;
    },
};

export default nextConfig;
