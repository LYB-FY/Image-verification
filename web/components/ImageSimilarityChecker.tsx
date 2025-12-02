"use client";

import { useState, useRef } from "react";
import { calculateSimilarity } from "@/utils/imageSimilarity";

export default function ImageSimilarityChecker() {
  const [image1, setImage1] = useState<string | null>(null);
  const [image2, setImage2] = useState<string | null>(null);
  const [similarity, setSimilarity] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging1, setIsDragging1] = useState(false);
  const [isDragging2, setIsDragging2] = useState(false);

  const fileInput1Ref = useRef<HTMLInputElement>(null);
  const fileInput2Ref = useRef<HTMLInputElement>(null);

  const handleFileSelect = (
    file: File,
    setImage: (url: string) => void,
    setError: (error: string | null) => void
  ) => {
    if (!file.type.startsWith("image/")) {
      setError("请选择图片文件");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setImage(e.target?.result as string);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleFileInput1 = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file, setImage1, setError);
    }
  };

  const handleFileInput2 = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file, setImage2, setError);
    }
  };

  const handleDragOver = (
    e: React.DragEvent,
    setIsDragging: (value: boolean) => void
  ) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (
    e: React.DragEvent,
    setIsDragging: (value: boolean) => void
  ) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (
    e: React.DragEvent,
    setImage: (url: string) => void,
    setIsDragging: (value: boolean) => void
  ) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file, setImage, setError);
    }
  };

  const handleCompare = async () => {
    if (!image1 || !image2) {
      setError("请上传两张图片");
      return;
    }

    setLoading(true);
    setError(null);
    setSimilarity(null);

    try {
      const score = await calculateSimilarity(image1, image2);
      setSimilarity(score);
    } catch (err) {
      setError(err instanceof Error ? err.message : "计算相似度时出错");
    } finally {
      setLoading(false);
    }
  };

  const getSimilarityLabel = (score: number) => {
    if (score >= 0.9) return "非常相似";
    if (score >= 0.7) return "相似";
    if (score >= 0.5) return "中等相似";
    if (score >= 0.3) return "不太相似";
    return "不相似";
  };

  return (
    <div>
      <div className="upload-section">
        <div
          className={`upload-box ${isDragging1 ? "dragover" : ""}`}
          onDragOver={(e) => handleDragOver(e, setIsDragging1)}
          onDragLeave={(e) => handleDragLeave(e, setIsDragging1)}
          onDrop={(e) => handleDrop(e, setImage1, setIsDragging1)}
          onClick={() => fileInput1Ref.current?.click()}
        >
          <input
            ref={fileInput1Ref}
            type="file"
            accept="image/*"
            onChange={handleFileInput1}
          />
          <label className="upload-label">📷 上传第一张图片</label>
          {image1 && <img src={image1} alt="预览1" className="preview-image" />}
        </div>

        <div
          className={`upload-box ${isDragging2 ? "dragover" : ""}`}
          onDragOver={(e) => handleDragOver(e, setIsDragging2)}
          onDragLeave={(e) => handleDragLeave(e, setIsDragging2)}
          onDrop={(e) => handleDrop(e, setImage2, setIsDragging2)}
          onClick={() => fileInput2Ref.current?.click()}
        >
          <input
            ref={fileInput2Ref}
            type="file"
            accept="image/*"
            onChange={handleFileInput2}
          />
          <label className="upload-label">📷 上传第二张图片</label>
          {image2 && <img src={image2} alt="预览2" className="preview-image" />}
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      <div style={{ textAlign: "center" }}>
        <button
          className="button"
          onClick={handleCompare}
          disabled={!image1 || !image2 || loading}
        >
          {loading ? "计算中..." : "🔍 比较相似度"}
        </button>
      </div>

      {loading && <div className="loading">正在计算相似度...</div>}

      {similarity !== null && (
        <div className="result-section">
          <div className="similarity-label">相似度得分</div>
          <div className="similarity-score">
            {(similarity * 100).toFixed(2)}%
          </div>
          <div className="similarity-label">
            {getSimilarityLabel(similarity)}
          </div>
        </div>
      )}
    </div>
  );
}
