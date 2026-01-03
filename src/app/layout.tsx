import type { Metadata } from "next";
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning> 
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
      </body>
    </html>
  );
}