import type { Metadata } from "next";
import Sidebar from "@/components/Sidebar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Garuda.One | Project Registry",
  description: "Centralized Project Configuration & Management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <div className="layout-container">
          <Sidebar />
          <main className="main-content">
            <header className="header" style={{ marginLeft: '-1.5rem', marginRight: '-1.5rem', marginTop: '-1.5rem', marginBottom: '1.5rem' }}>
              <div style={{ fontWeight: 500, color: 'var(--muted-foreground)' }}>
                Projects
              </div>
            </header>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
