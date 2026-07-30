import type { Metadata, Viewport } from "next";
import { Saira, Permanent_Marker } from "next/font/google";
import "./globals.css";
import { LaunchProvider } from "@/components/LaunchContext";
import Sidebar from "@/components/Sidebar";

// Saira substitui o display "Gear Wide" da marca; Permanent Marker substitui
// "Slightly Marker" (§1.5). O marker só aparece em kicker e assinatura.
const saira = Saira({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-saira",
  display: "swap",
});

const marker = Permanent_Marker({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-marker",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Dashlara · Lara Castilho",
  description: "Funil de captação, tráfego e vendas do lançamento",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="pt-BR"
      className={`${saira.variable} ${marker.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <LaunchProvider>
          <Sidebar />
          <main className="lg:pl-60 min-h-screen page-gradient">
            <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
              {children}
            </div>
          </main>
        </LaunchProvider>
      </body>
    </html>
  );
}
