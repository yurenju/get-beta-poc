import { useState, useEffect, useMemo } from 'react';
import type { Route } from '../types/route';

interface RouteCardProps {
  route: Route;
  similarity: number;
  matchedImageId: string;
  getImageUrl: (filename: string) => Promise<string>;
  onClick: () => void;
}

/**
 * 路線卡片元件
 * - 顯示縮圖（含標記點）
 * - 顯示相似度百分比
 * - 顯示路線名稱
 */
export function RouteCard({
  route,
  similarity,
  matchedImageId,
  getImageUrl,
  onClick
}: RouteCardProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  // 使用 useMemo 計算匹配的圖片和標記點
  const matchedImage = useMemo(() => {
    return route.images.find(img => img.id === matchedImageId) || route.images[0];
  }, [route.images, matchedImageId]);

  const points = matchedImage?.points || [];

  // 載入圖片 URL（非同步操作可以在 effect 中進行）
  useEffect(() => {
    if (matchedImage) {
      getImageUrl(matchedImage.filename)
        .then(setImageUrl)
        .catch(console.error);
    }
  }, [matchedImage, getImageUrl]);

  return (
    <div className="route-card" onClick={onClick}>
      <div style={{ position: 'relative', width: '100%', height: 90 }}>
        {imageUrl ? (
          <>
            <img
              src={imageUrl}
              alt={route.name}
              className="route-card-thumbnail"
            />
            <svg
              viewBox="0 0 1 1"
              preserveAspectRatio="none"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none'
              }}
            >
              {points.map((point, index) => (
                <g key={index}>
                  <line
                    x1={point.x - 0.03}
                    y1={point.y}
                    x2={point.x + 0.03}
                    y2={point.y}
                    stroke="white"
                    strokeWidth={0.012}
                  />
                  <line
                    x1={point.x}
                    y1={point.y - 0.03}
                    x2={point.x}
                    y2={point.y + 0.03}
                    stroke="white"
                    strokeWidth={0.012}
                  />
                  <line
                    x1={point.x - 0.03}
                    y1={point.y}
                    x2={point.x + 0.03}
                    y2={point.y}
                    stroke="red"
                    strokeWidth={0.006}
                  />
                  <line
                    x1={point.x}
                    y1={point.y - 0.03}
                    x2={point.x}
                    y2={point.y + 0.03}
                    stroke="red"
                    strokeWidth={0.006}
                  />
                </g>
              ))}
            </svg>
          </>
        ) : (
          <div style={{
            width: '100%',
            height: '100%',
            backgroundColor: '#f0f0f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            載入中...
          </div>
        )}
      </div>
      <div className="route-card-info">
        <div className="route-card-similarity">{similarity}%</div>
        <div className="route-card-name">{route.name}</div>
      </div>
    </div>
  );
}
