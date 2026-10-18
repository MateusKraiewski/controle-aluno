import type { Metadata } from "next";
import type { Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aula em Dia — seu espaço de estudos",
  description: "Organize suas aulas, matérias e histórico de estudos.",
  applicationName: "Aula em Dia",
  manifest: "/manifest.webmanifest",
  // Let iOS prefer the standalone-capable manifest icon when adding to Home Screen.
  icons: { icon: "/icon.svg" },
  appleWebApp: { capable: true, title: "Aula em Dia", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#243d34",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
