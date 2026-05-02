import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Remember Better",
  description: "将学习材料翻译成更适合记忆的空间场景。"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
