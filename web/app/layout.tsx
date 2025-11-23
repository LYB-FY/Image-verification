import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "图片相似度校验工具",
  description: "使用 MobileNetV2 进行图片相似度比较",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
