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
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r={0.02}
            fill="red"
            stroke="white"
            strokeWidth={0.005}
          />
        ))}
      </svg>
    </div>
  );
}
