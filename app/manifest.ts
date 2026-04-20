import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Note Park",
    short_name: "Note Park",
    description: "素早くメモを取るノートアプリ",
    start_url: "/",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#115e59",
    icons: [
      {
        src: "/icons/NotePark.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
