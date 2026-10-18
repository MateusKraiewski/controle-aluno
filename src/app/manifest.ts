import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Aula em Dia — seu espaço de estudos",
    short_name: "Aula em Dia",
    description: "Organize suas aulas, matérias e histórico de estudos.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f6f5f0",
    theme_color: "#243d34",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
