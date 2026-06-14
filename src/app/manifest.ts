import type { MetadataRoute } from "next";

// Web App Manifest (PWA) · Next App Router lo sirve en /manifest.webmanifest
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pronóstico Mundial 2026",
    short_name: "Mundial 2026",
    description: "Torneo privado de pronósticos del Mundial FIFA 2026",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#15803d",
    theme_color: "#15803d",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
