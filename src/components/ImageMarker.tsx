import type { Point } from '../types/route';

interface ImageMarkerProps {
  imageUrl: string;
  points: Point[];
  onPointsChange?: (points: Point[]) => void;
  readonly?: boolean;
}

/**
 * 圖片標記元件
 * - 顯示圖片並在上方疊加標記點
 * - 點擊圖片可新增標記點（非唯讀模式）
 * - 座標使用 0-1 正規化值
 */
export function ImageMarker({
  imageUrl,
  points,
  onPointsChange,
  readonly = false
}: ImageMarkerProps) {
  const handleClick = (e: React.PointerEvent<HTMLDivElement>) => {
    if (readonly || !onPointsChange) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    // 新增標記點
    onPointsChange([...points, { x, y }]);
  };

  return (
    <div
      className="image-marker"
      onPointerDown={handleClick}
      style={{
        position: 'relative',
        display: 'inline-block',
        cursor: readonly ? 'default' : 'crosshair',
        touchAction: 'none'
      }}
    >
      <img
        src={imageUrl}
        alt="Route"
        style={{
          display: 'block',
          maxWidth: '100%',
          height: 'auto'
        }}
        draggable={false}
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
            {/* 十字標記 - 白色外框 */}
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
            {/* 十字標記 - 紅色內線 */}
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
    </div>
  );
}
