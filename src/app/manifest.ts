import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Dépenses enfants",
    short_name: "Dépenses",
    description: "Suivi des dépenses partagées pour Eugène et Lambert",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f6f8",
    theme_color: "#2563eb",
    lang: "fr-CA",
    orientation: "portrait",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
