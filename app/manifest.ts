import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Chaosküche",
    short_name: "Chaosküche",
    description: "Meine persönliche Rezept-App",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f5f4",
    theme_color: "#6B705C",
    orientation: "portrait",
  };
}