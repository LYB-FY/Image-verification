"use client";

import { useState, useRef } from "react";
import Link from "next/link";

type SearchMode = "upload" | "id" | "url";

export default function ImageSearchPage() {
  const [searchMode, setSearchMode] = useState<SearchMode>("upload");
  const [image, setImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageId, setImageId] = useState<string>("");
  const [imageUrl, setImageUrl] = useState<string>("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [threshold, setThreshold] = useState(0.8);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (
    file: File,
    setImage: (url: string) => void,
    setError: (error: string | null) => void
  ) => {
    if (!file.type.startsWith("image/")) {
      setError("请选择图片文件");
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImage(e.target?.result as string);
      setError(null);
      setResults([]); // 清空之前的结果
    };
    reader.readAsDataURL(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file, setImage, setError);
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

  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    setResults([]);

    try {
      let response;

      if (searchMode === "upload") {
        // 上传图片搜索
        if (!imageFile) {
          setError("请先上传图片");
          setLoading(false);
          return;
        }

        const formData = new FormData();
        formData.append("file", imageFile);

        response = await fetch(
          `http://8.141.100.214:7001/api/image-feature/search-similar?threshold=${threshold}`,
          {
            method: "POST",
            body: formData,
          }
        );
      } else if (searchMode === "id") {
        // 通过图片ID搜索
        if (!imageId.trim()) {
          setError("请输入图片ID");
          setLoading(false);
          return;
        }

        response = await fetch(
          `http://8.141.100.214:7001/api/image-feature/search-by-id-or-url?imageId=${encodeURIComponent(
            imageId
          )}&threshold=${threshold}`,
          {
            method: "GET",
          }
        );
      } else {
        // 通过图片URL搜索
        if (!imageUrl.trim()) {
          setError("请输入图片URL");
          setLoading(false);
          return;
        }

        response = await fetch(
          `http://8.141.100.214:7001/api/image-feature/search-by-id-or-url?imageUrl=${encodeURIComponent(
            imageUrl
          )}&threshold=${threshold}`,
          {
            method: "GET",
          }
        );
      }

      const data = await response.json();

      if (data.success) {
        setResults(data.data.images);
        if (data.data.images.length === 0) {
          setError("未找到相似图片");
        }
      } else {
        setError(data.message || "搜索失败");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "搜索时出错，请确保后端服务已启动"
      );
    } finally {
      setLoading(false);
    }
  };

  const canSearch = () => {
    if (searchMode === "upload") return !!image;
    if (searchMode === "id") return !!imageId.trim();
    if (searchMode === "url") return !!imageUrl.trim();
    return false;
  };

  return (
    <div className="container">
      <div className="nav-links">
        <Link href="/" className="nav-link">
          🏠 首页
        </Link>
        <Link href="/similar-groups" className="nav-link">
          📊 查看相似图片分组
        </Link>
      </div>
      <h1 className="title">图片相似度搜索</h1>
      <p className="subtitle">
        搜索数据库中相似度大于 {threshold * 100}% 的图片
      </p>

      {/* 搜索模式选择 */}
      <div className="mode-selector">
        <button
          className={`mode-button ${searchMode === "upload" ? "active" : ""}`}
          onClick={() => {
            setSearchMode("upload");
            setError(null);
            setResults([]);
          }}
        >
          📤 上传图片
        </button>
        <button
          className={`mode-button ${searchMode === "id" ? "active" : ""}`}
          onClick={() => {
            setSearchMode("id");
            setError(null);
            setResults([]);
          }}
        >
          🔢 图片ID
        </button>
        <button
          className={`mode-button ${searchMode === "url" ? "active" : ""}`}
          onClick={() => {
            setSearchMode("url");
            setError(null);
            setResults([]);
          }}
        >
          🔗 图片URL
        </button>
      </div>

      <div className="search-container">
        {/* 上传图片模式 */}
        {searchMode === "upload" && (
          <div className="upload-section">
            <div
              className={`upload-box ${isDragging ? "dragover" : ""}`}
              onDragOver={(e) => handleDragOver(e, setIsDragging)}
              onDragLeave={(e) => handleDragLeave(e, setIsDragging)}
              onDrop={(e) => handleDrop(e, setImage, setIsDragging)}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileInput}
                style={{ display: "none" }}
              />
              {image ? (
                <img src={image} alt="预览" className="preview-image" />
              ) : (
                <div className="upload-placeholder">
                  <span className="upload-icon">📷</span>
                  <span className="upload-text">点击或拖拽上传图片</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 图片ID模式 */}
        {searchMode === "id" && (
          <div className="input-section">
            <div className="input-group">
              <label className="input-label">请输入图片ID：</label>
              <input
                type="text"
                className="text-input"
                placeholder="例如：1730869206754000000"
                value={imageId}
                onChange={(e) => setImageId(e.target.value)}
              />
              <p className="input-hint">
                提示：图片ID需要在数据库中已存在特征向量
              </p>
            </div>
          </div>
        )}

        {/* 图片URL模式 */}
        {searchMode === "url" && (
          <div className="input-section">
            <div className="input-group">
              <label className="input-label">请输入图片URL：</label>
              <input
                type="text"
                className="text-input"
                placeholder="例如：https://assets.ecaisys.com/similarity/image.jpg"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
              <p className="input-hint">
                提示：系统会从URL加载图片并计算特征向量
              </p>
            </div>
          </div>
        )}

        <div className="controls">
          <div className="threshold-control">
            <label>相似度阈值: {(threshold * 100).toFixed(0)}%</label>
            <input
              type="range"
              min="0.5"
              max="0.99"
              step="0.01"
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value))}
            />
          </div>
          <button
            className="button search-button"
            onClick={handleSearch}
            disabled={!canSearch() || loading}
          >
            {loading ? "正在搜索..." : "🔍 开始搜索"}
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {results.length > 0 && (
        <div className="results-section">
          <h2 className="results-title">搜索结果 ({results.length})</h2>
          <div className="results-grid">
            {results.map((item) => (
              <div key={item.imageId} className="result-card">
                <div className="result-image-container">
                  <img
                    src={item.url}
                    alt={`ID: ${item.imageId}`}
                    className="result-image"
                  />
                  <div className="similarity-badge">
                    {item.similarity}% 相似
                  </div>
                </div>
                <div className="result-info">
                  <p className="result-id">ID: {item.imageId}</p>
                  <p className="result-md5" title={item.md5}>
                    MD5: {item.md5?.substring(0, 8)}...
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
            Helvetica, Arial, sans-serif;
        }
        .title {
          text-align: center;
          color: #333;
          margin-bottom: 0.5rem;
        }
        .subtitle {
          text-align: center;
          color: #666;
          margin-bottom: 2rem;
        }
        .mode-selector {
          display: flex;
          justify-content: center;
          gap: 1rem;
          margin-bottom: 2rem;
        }
        .mode-button {
          padding: 0.8rem 1.5rem;
          border: 2px solid #e0e0e0;
          background: white;
          border-radius: 8px;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.3s ease;
          font-weight: 500;
        }
        .mode-button:hover {
          border-color: #0070f3;
          background: #f0f7ff;
        }
        .mode-button.active {
          border-color: #0070f3;
          background: #0070f3;
          color: white;
        }
        .input-section {
          width: 100%;
          max-width: 600px;
          margin: 0 auto;
        }
        .input-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .input-label {
          font-weight: 600;
          color: #333;
          font-size: 1rem;
        }
        .text-input {
          width: 100%;
          padding: 1rem;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          font-size: 1rem;
          transition: border-color 0.3s;
        }
        .text-input:focus {
          outline: none;
          border-color: #0070f3;
        }
        .input-hint {
          font-size: 0.85rem;
          color: #888;
          margin: 0;
        }
        .search-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2rem;
          margin-bottom: 2rem;
        }
        .upload-box {
          width: 300px;
          height: 300px;
          border: 2px dashed #ccc;
          border-radius: 12px;
          display: flex;
          justify-content: center;
          align-items: center;
          cursor: pointer;
          transition: all 0.3s ease;
          background: #f9f9f9;
          overflow: hidden;
          position: relative;
        }
        .upload-box:hover,
        .upload-box.dragover {
          border-color: #0070f3;
          background: #f0f7ff;
        }
        .upload-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          color: #888;
        }
        .upload-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }
        .preview-image {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        .controls {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          width: 100%;
          max-width: 400px;
        }
        .threshold-control {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .threshold-control input {
          width: 100%;
        }
        .button {
          padding: 0.8rem 2rem;
          background: #0070f3;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 1.1rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
          width: 100%;
        }
        .button:hover:not(:disabled) {
          background: #0051a2;
        }
        .button:disabled {
          background: #ccc;
          cursor: not-allowed;
        }
        .error-message {
          padding: 1rem;
          background: #fff0f0;
          color: #d32f2f;
          border: 1px solid #ffcdd2;
          border-radius: 8px;
          margin-bottom: 2rem;
          text-align: center;
        }
        .results-section {
          margin-top: 3rem;
        }
        .results-title {
          margin-bottom: 1.5rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid #eee;
        }
        .results-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 1.5rem;
        }
        .result-card {
          border: 1px solid #eee;
          border-radius: 12px;
          overflow: hidden;
          background: white;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
          transition: transform 0.2s;
        }
        .result-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
        }
        .result-image-container {
          position: relative;
          width: 100%;
          height: 200px;
          background: #f5f5f5;
        }
        .result-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .similarity-badge {
          position: absolute;
          top: 10px;
          right: 10px;
          background: rgba(0, 112, 243, 0.9);
          color: white;
          padding: 4px 8px;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: bold;
        }
        .result-info {
          padding: 1rem;
        }
        .result-id {
          font-weight: 600;
          margin: 0 0 0.25rem 0;
          color: #333;
        }
        .result-md5 {
          font-size: 0.8rem;
          color: #888;
          margin: 0;
          word-break: break-all;
        }
      `}</style>
    </div>
  );
}
