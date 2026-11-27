import type { NextConfig } from "next";

const production = process.env.NODE_ENV === "production";
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://www.googletagmanager.com${production ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https:",
  "frame-src 'self' https://www.google.com https://www.google.com.pe https://www.tiktok.com",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  production ? "upgrade-insecure-requests" : "",
].filter(Boolean).join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  ...(production ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }] : []),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compress: true,
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
  },
  async rewrites() {
    const controlWorker = "https://merly-control-app.merlyimport.workers.dev";
    return {
      beforeFiles: [
        { source: "/assets/merly-logo.png", destination: `${controlWorker}/assets/merly-logo.png` },
        { source: "/control", destination: `${controlWorker}/control` },
        { source: "/control/:path*", destination: `${controlWorker}/control/:path*` },
        { source: "/login", destination: `${controlWorker}/login` },
        { source: "/logout", destination: `${controlWorker}/logout` },
      ],
      afterFiles: [],
      // Keep the site's own /api/admin and /api/catalogo routes intact.
      fallback: [
        { source: "/api/:path*", destination: `${controlWorker}/api/:path*` },
      ],
    };
  },
  async redirects() {
    return [
      { source: "/wp-sitemap.xml", destination: "/sitemap.xml", permanent: true },
      { source: "/shop", destination: "/catalogo", permanent: true },
      { source: "/producto/:path*", destination: "/catalogo", permanent: true },
      { source: "/categoria-producto/:path*", destination: "/catalogo", permanent: true },
      { source: "/marca/:path*", destination: "/catalogo", permanent: true },
      { source: "/tienda/:path*", destination: "/catalogo", permanent: true },
      { source: "/contacto", destination: "/", permanent: true },
      { source: "/my-account/:path*", destination: "/", permanent: true },
    ];
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/admin/:path*", headers: [
        { key: "Cache-Control", value: "no-store, max-age=0" },
        { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
      ] },
      { source: "/api/admin/:path*", headers: [
        { key: "Cache-Control", value: "no-store, max-age=0" },
        { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
      ] },
    ];
  },
};

export default nextConfig;
