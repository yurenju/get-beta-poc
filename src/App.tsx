import { useState } from 'react';
import './App.css';
import { ImageInput } from './components/ImageInput';
import { ImageMarker } from './components/ImageMarker';
import { ClearButton } from './components/ClearButton';
import type { Point } from './types/route';

function App() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const [points, setPoints] = useState<Point[]>([]);

  const handleImageSelect = (blob: Blob, url: string) => {
    // 清理之前的 Blob URL
    if (imageUrl) {
      URL.revokeObjectURL(imageUrl);
    }
    setImageBlob(blob);
    setImageUrl(url);
    setPoints([]); // 清除標記點
  };

  const handleClear = () => {
    setPoints([]);
  };

  return (
    <div className="app">
      <h1>抱石路線標註 POC</h1>

      {/* 圖片輸入 */}
      <ImageInput onImageSelect={handleImageSelect} />

      {/* 圖片顯示與標記 */}
      <div className="image-marker-container">
        {imageUrl ? (
          <ImageMarker
            imageUrl={imageUrl}
            points={points}
            onPointsChange={setPoints}
          />
        ) : (
          <div className="placeholder">
            請拍照或上傳圖片
          </div>
        )}
      </div>

      {/* 清除按鈕 */}
      {imageUrl && (
        <ClearButton onClick={handleClear} disabled={points.length === 0} />
      )}

      {/* 標記點數量提示 */}
      {points.length > 0 && (
        <div style={{ textAlign: 'center', color: '#666' }}>
          已標記 {points.length} 個點
        </div>
      )}

      {/* 搜尋結果區域（後續任務實作） */}
      <div className="search-results">
        {/* 搜尋結果將在後續任務中實作 */}
      </div>

      {/* 操作按鈕區 */}
      <div className="action-buttons">
        <button className="btn-primary" disabled={!imageUrl || points.length < 3}>
          建立新路線
        </button>
        <button className="btn-secondary">
          查看所有路線
        </button>
      </div>

      {/* Debug: 顯示 imageBlob 狀態 */}
      {imageBlob && (
        <div style={{ fontSize: '12px', color: '#888', textAlign: 'center' }}>
          圖片大小: {(imageBlob.size / 1024).toFixed(1)} KB
        </div>
      )}
    </div>
  );
}

export default App;
