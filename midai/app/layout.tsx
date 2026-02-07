import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Midai - Music Collection & Discovery",
  description: "A visual music collection manager with interactive genre graphs",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
