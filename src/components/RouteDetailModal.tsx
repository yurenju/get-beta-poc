import { useState, useEffect, useMemo } from 'react';
import type { Route } from '../types/route';

interface RouteDetailModalProps {
  route: Route;
  matchedImageId?: string;
  getImageUrl: (filename: string) => Promise<string>;
  onClose: () => void;
  onAddImage?: () => void;
  showAddButton?: boolean;
}

/**
 * 路線詳情彈窗
 */
export function RouteDetailModal({
  route,
  matchedImageId,
  getImageUrl,
  onClose,
  onAddImage,
  showAddButton = true
}: RouteDetailModalProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(() => {
    // 初始化時就計算匹配的圖片索引
    if (matchedImageId) {
      const index = route.images.findIndex(img => img.id === matchedImageId);
      return index !== -1 ? index : 0;
    }
    return 0;
  });

  // 使用 useMemo 計算當前圖片和標記點
  const currentImage = useMemo(() => {
    return route.images[currentImageIndex];
  }, [route.images, currentImageIndex]);

  const points = currentImage?.points || [];

  // 載入圖片 URL（非同步操作）
  useEffect(() => {
    if (currentImage) {
      getImageUrl(currentImage.filename)
        .then(setImageUrl)
        .catch(console.error);
    }
  }, [currentImage, getImageUrl]);

  const handlePrev = () => {
    setCurrentImageIndex(prev =>
      prev > 0 ? prev - 1 : route.images.length - 1
    );
  };

  const handleNext = () => {
    setCurrentImageIndex(prev =>
      prev < route.images.length - 1 ? prev + 1 : 0
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{route.name}</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <div style={{ position: 'relative' }}>
            {imageUrl ? (
              <>
                <img
                  src={imageUrl}
                  alt={route.name}
                  style={{
                    display: 'block',
                    width: '100%',
                    height: 'auto',
                    borderRadius: 8
                  }}
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
                        x1={point.x - 0.025}
                        y1={point.y}
                        x2={point.x + 0.025}
                        y2={point.y}
                        stroke="white"
                        strokeWidth={0.008}
                      />
                      <line
                        x1={point.x}
                        y1={point.y - 0.025}
                        x2={point.x}
                        y2={point.y + 0.025}
                        stroke="white"
                        strokeWidth={0.008}
                      />
                      <line
                        x1={point.x - 0.025}
                        y1={point.y}
                        x2={point.x + 0.025}
                        y2={point.y}
                        stroke="red"
                        strokeWidth={0.004}
                      />
                      <line
                        x1={point.x}
                        y1={point.y - 0.025}
                        x2={point.x}
                        y2={point.y + 0.025}
                        stroke="red"
                        strokeWidth={0.004}
                      />
                    </g>
                  ))}
                </svg>
              </>
            ) : (
              <div style={{
                height: 200,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f5f5f5',
                borderRadius: 8
              }}>
                載入中...
              </div>
            )}
          </div>

          {/* 多圖片切換 */}
          {route.images.length > 1 && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 16,
              marginTop: 12
            }}>
              <button onClick={handlePrev} style={{ padding: '4px 12px' }}>
                &lt;
              </button>
              <span>
                {currentImageIndex + 1} / {route.images.length}
              </span>
              <button onClick={handleNext} style={{ padding: '4px 12px' }}>
                &gt;
              </button>
            </div>
          )}
        </div>
        <div className="modal-footer">
          {showAddButton && onAddImage && (
            <button className="btn-primary" onClick={onAddImage}>
              將我的照片加入此路線
            </button>
          )}
          <button className="btn-secondary" onClick={onClose}>
            關閉
          </button>
        </div>
      </div>
    </div>
  );
}
