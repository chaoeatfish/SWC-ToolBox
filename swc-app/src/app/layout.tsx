import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SWC Toolbox - 水土保持工具箱",
  description: "水土保持报告编制个人工具箱",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-[100dvh] bg-background text-foreground">
        <Sidebar />
        <main className="ml-60 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-5xl px-8 py-8">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
