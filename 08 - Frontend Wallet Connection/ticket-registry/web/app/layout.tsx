import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SolanaProvider from "./SolanaProvider"; // 🟢 1. Import Provider vào đây

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ticket Registry dApp",
  description: "Dự án bán vé on-chain Solana",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* 🟢 2. Bọc SolanaProvider ra ngoài toàn bộ các trang con */}
        <SolanaProvider>
          {children}
        </SolanaProvider>
      </body>
    </html>
  );
}