import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "Csavargó – Tervezd meg a következő kalandodat",
  description: "Utazások, útitervek, térképek és közös költségek egy helyen.",
  icons: { icon: "/images/csavargo-logo.png", apple: "/images/csavargo-logo.png" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="hu" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
