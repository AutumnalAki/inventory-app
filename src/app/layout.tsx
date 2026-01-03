import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { RoleProvider } from "@/context/RoleContext";
import { InventoryProvider } from "@/context/InventoryContext";
import { ThemeProvider } from "@/context/ThemeContext";

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
      {/* FIX: Removed 'bg-gray-50' and 'dark:bg-black'. 
          Added 'transition-colors' to ensure the body background fades too. */}
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased transition-colors duration-500 ease-in-out`}>
        <ThemeProvider>
          <RoleProvider>
            <InventoryProvider>
              {children}
            </InventoryProvider>
          </RoleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}