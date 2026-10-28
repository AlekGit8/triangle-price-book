import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

initOpenNextCloudflareForDev();

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Don't advertise the framework in the X-Powered-By response header.
  poweredByHeader: false,
};
export default nextConfig;
