"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import ImageSimilarityChecker from "@/components/ImageSimilarityChecker";

export default function Home() {
  return (
    <div className="container">
      <div className="nav-links">
        <Link href="/similar-groups" className="nav-link">
          📊 查看相似图片分组
        </Link>
        <Link href="/image-search" className="nav-link">
          🔍 以图搜图
        </Link>
      </div>
      <h1>🖼️ 图片相似度校验工具</h1>
      <ImageSimilarityChecker />
    </div>
  );
}
