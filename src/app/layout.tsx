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
        <link rel="apple-touch-icon" href="/favicon.ico" />
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
  const nodeEnv = process.env.NODE_ENV;
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', async function() {
              try {
                var appEnv = '${nodeEnv}';
                var isLocalhost =
                  window.location.hostname === 'localhost' ||
                  window.location.hostname === '127.0.0.1';
                var isSecureContext = window.location.protocol === 'https:';
                var shouldRegisterSW = appEnv === 'production' && isSecureContext;

                if (!shouldRegisterSW || isLocalhost) {
                  var registrations = await navigator.serviceWorker.getRegistrations();
                  await Promise.all(registrations.map(function(reg) { return reg.unregister(); }));

                  if ('caches' in window) {
                    var cacheKeys = await caches.keys();
                    await Promise.all(
                      cacheKeys
                        .filter(function(key) { return key.indexOf('cdm-labtrack') === 0; })
                        .map(function(key) { return caches.delete(key); })
                    );
                  }

                  console.log('ServiceWorker disabled for non-production/non-https context and cache cleared.');
                  return;
                }

                var registration = await navigator.serviceWorker.register('/sw.js?v=3');
                console.log('ServiceWorker registered:', registration.scope);
                registration.update();
              } catch (err) {
                console.log('ServiceWorker registration failed:', err);
              }
            });
          }
        `,
      }}
    />
  );
}