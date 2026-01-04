import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { RoleProvider } from "@/context/RoleContext";
import { InventoryProvider } from "@/context/InventoryContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { PopupProvider } from "@/context/PopupContext"; // <--- IMPORT THIS

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CDM LabTrack",
  description: "Laboratory Asset Management System",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CDM LabTrack",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#f97316",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning> 
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased transition-colors duration-500 ease-in-out`}>
        <ThemeProvider>
          <PopupProvider> {/* <--- WRAP HERE */}
            <RoleProvider>
              <InventoryProvider>
                {children}
              </InventoryProvider>
            </RoleProvider>
          </PopupProvider>
        </ThemeProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}

// Service Worker Registration Component
function ServiceWorkerRegister() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js')
                .then(function(registration) {
                  console.log('ServiceWorker registered:', registration.scope);
                })
                .catch(function(err) {
                  console.log('ServiceWorker registration failed:', err);
                });
            });
          }
        `,
      }}
    />
  );
}