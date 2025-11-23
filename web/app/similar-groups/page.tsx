"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import "./styles.css";

interface ImageInfo {
  id: string;
  url: string;
  fileType: number;
  md5: string;
  createTime: string;
}

interface SimilarGroup {
  groupId: number;
  imageCount: number;
  images: ImageInfo[];
}

interface ApiResponse {
  success: boolean;
  message: string;
  data?: {
    groups: SimilarGroup[];
    groupCount: number;
    totalImages: number;
    threshold: number;
  };
}

export default function SimilarGroupsPage() {
  const [groups, setGroups] = useState<SimilarGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [threshold, setThreshold] = useState(0.9);
  const [stats, setStats] = useState<{
    groupCount: number;
    totalImages: number;
  } | null>(null);

  const fetchSimilarGroups = async () => {
    setLoading(true);
    setError(null);
    setGroups([]);
    setStats(null);

    try {
      const response = await fetch(
        `http://127.0.0.1:7001/api/image-feature/similar-groups?threshold=${threshold}`
      );

      const data: ApiResponse = await response.json();

      if (data.success && data.data) {
        setGroups(data.data.groups);
        setStats({
          groupCount: data.data.groupCount,
          totalImages: data.data.totalImages,
        });
      } else {
        setError(data.message || "获取相似图片分组失败");
      }
    } catch (err: any) {
      setError(`请求失败: ${err.message}`);
      console.error("获取相似图片分组失败:", err);
    } finally {
      setLoading(false);
    }
  };

  const getFileTypeLabel = (fileType: number): string => {
    const types: Record<number, string> = {
      1: "PNG",
      2: "JPG",
      3: "GIF",
      4: "WebP",
    };
    return types[fileType] || "Unknown";
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="container">
      <div className="nav-links">
        <Link href="/" className="nav-link">
          🏠 首页
        </Link>
        <Link href="/image-search" className="nav-link">
          🔍 以图搜图
        </Link>
      </div>
      <h1>🖼️ 相似图片分组查看</h1>

      {/* 控制面板 */}
      <div className="control-panel">
        <div className="threshold-control">
          <label htmlFor="threshold">
            相似度阈值: <strong>{(threshold * 100).toFixed(0)}%</strong>
          </label>
          <input
            id="threshold"
            type="range"
            min="0.5"
            max="1"
            step="0.05"
            value={threshold}
            onChange={(e) => setThreshold(parseFloat(e.target.value))}
            className="threshold-slider"
          />
          <div className="threshold-labels">
            <span>50%</span>
            <span>75%</span>
            <span>100%</span>
          </div>
        </div>

        <button
          onClick={fetchSimilarGroups}
          disabled={loading}
          className="button button-primary"
        >
          {loading ? "🔄 加载中..." : "🔍 查找相似图片"}
        </button>
      </div>

      {/* 统计信息 */}
      {stats && (
        <div className="stats-card">
          <div className="stat-item">
            <div className="stat-value">{stats.groupCount}</div>
            <div className="stat-label">相似组数</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{stats.totalImages}</div>
            <div className="stat-label">相似图片总数</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{(threshold * 100).toFixed(0)}%</div>
            <div className="stat-label">相似度阈值</div>
          </div>
        </div>
      )}

      {/* 错误信息 */}
      {error && <div className="error">{error}</div>}

      {/* 加载状态 */}
      {loading && (
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>正在分析图片相似度...</p>
        </div>
      )}

      {/* 结果为空 */}
      {!loading && groups.length === 0 && !error && stats && (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <p>没有找到相似的图片分组</p>
          <p className="empty-hint">
            尝试降低相似度阈值，或者确保数据库中有足够的图片数据
          </p>
        </div>
      )}

      {/* 相似图片分组展示 */}
      {!loading && groups.length > 0 && (
        <div className="groups-container">
          {groups.map((group) => (
            <div key={group.groupId} className="group-card">
              <div className="group-header">
                <h2>
                  🎯 分组 #{group.groupId}
                  <span className="group-count">{group.imageCount} 张图片</span>
                </h2>
              </div>

              <div className="images-grid">
                {group.images.map((image) => (
                  <div key={image.id} className="image-card">
                    <div className="image-wrapper">
                      <img
                        src={`${image.url}`}
                        alt={`图片 ${image.id}`}
                        className="thumbnail"
                        loading="lazy"
                      />
                      <div className="image-overlay">
                        <span className="file-type-badge">
                          {getFileTypeLabel(image.fileType)}
                        </span>
                      </div>
                    </div>
                    <div className="image-info">
                      <div className="image-id" title={image.id}>
                        ID: {image.id.slice(0, 12)}...
                      </div>
                      <div className="image-meta">
                        <span title={image.md5}>
                          MD5: {image.md5.slice(0, 8)}...
                        </span>
                        <span title={image.createTime}>
                          {formatDate(image.createTime)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
