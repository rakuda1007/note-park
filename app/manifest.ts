import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Note Park",
    short_name: "Note Park",
    description: "素早くメモを取るノートアプリ",
    lang: "ja",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "browser"],
    orientation: "any",
    background_color: "#09090b",
    theme_color: "#115e59",
    categories: ["productivity", "utilities"],
    icons: [
      {
        src: "/icons/NotePark.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/NotePark.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
