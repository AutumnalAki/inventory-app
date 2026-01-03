import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// 1. Import the Context Providers
import { RoleProvider } from "@/context/RoleContext";
import { InventoryProvider } from "@/context/InventoryContext";

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
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-black text-white`}>
        {/* 2. Wrap the entire application with Providers here */}
        <RoleProvider>
          <InventoryProvider>
            {children}
          </InventoryProvider>
        </RoleProvider>
      </body>
    </html>
  );
}