import { useState, useMemo } from 'react';
import './App.css';
import { ImageInput } from './components/ImageInput';
import { ImageMarker } from './components/ImageMarker';
import { ClearButton } from './components/ClearButton';
import { SearchResults } from './components/SearchResults';
import { RouteDetailModal } from './components/RouteDetailModal';
import { CreateRouteModal } from './components/CreateRouteModal';
import { RouteListModal } from './components/RouteListModal';
import { useRoutes } from './hooks/useRoutes';
import { searchRoutes, type SearchResult } from './lib/matching';
import type { Point, Route } from './types/route';

function App() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const [points, setPoints] = useState<Point[]>([]);
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRouteList, setShowRouteList] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // 路線資料管理
  const { routes, loading, getImageUrl, addRoute, addImageToRoute, deleteRoute, refresh } = useRoutes();

  // 即時搜尋：當 points 變更時自動搜尋
  const searchResults = useMemo(() => {
    if (points.length === 0 || routes.length === 0) {
      return [];
    }
    return searchRoutes(points, routes);
  }, [points, routes]);

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

  // 顯示 Toast 訊息
  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2000);
  };

  // 點擊搜尋結果
  const handleRouteClick = (result: SearchResult) => {
    setSelectedResult(result);
  };

  // 將照片加入現有路線
  const handleAddToRoute = async () => {
    if (!selectedResult || !imageBlob || points.length === 0) return;

    try {
      await addImageToRoute(selectedResult.route.id, imageBlob, points);
      showToast('已成功加入路線！');
      setSelectedResult(null);
      await refresh();
    } catch (err) {
      showToast('加入失敗：' + (err instanceof Error ? err.message : '未知錯誤'));
    }
  };

  // 建立新路線
  const handleCreateRoute = async (name: string) => {
    if (!imageBlob || points.length === 0) return;

    try {
      await addRoute(name, imageBlob, points);
      showToast('路線建立成功！');
      setShowCreateModal(false);
      await refresh();
    } catch (err) {
      showToast('建立失敗：' + (err instanceof Error ? err.message : '未知錯誤'));
    }
  };

  // 刪除路線
  const handleDeleteRoute = async (routeId: string) => {
    try {
      await deleteRoute(routeId);
      showToast('路線已刪除');
      await refresh();
    } catch (err) {
      showToast('刪除失敗：' + (err instanceof Error ? err.message : '未知錯誤'));
    }
  };

  // 從路線清單點擊查看詳情
  const handleRouteListClick = (route: Route) => {
    setSelectedRoute(route);
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

      {/* 搜尋結果區域 */}
      {loading ? (
        <div style={{ textAlign: 'center', color: '#888' }}>載入中...</div>
      ) : (
        <SearchResults
          results={searchResults}
          getImageUrl={getImageUrl}
          onRouteClick={handleRouteClick}
        />
      )}

      {/* 操作按鈕區 */}
      <div className="action-buttons">
        <button
          className="btn-primary"
          disabled={!imageUrl || points.length < 3}
          onClick={() => setShowCreateModal(true)}
        >
          建立新路線
        </button>
        <button className="btn-secondary" onClick={() => setShowRouteList(true)}>
          查看所有路線
        </button>
      </div>

      {/* Debug: 顯示 imageBlob 狀態 */}
      {imageBlob && (
        <div style={{ fontSize: '12px', color: '#888', textAlign: 'center' }}>
          圖片大小: {(imageBlob.size / 1024).toFixed(1)} KB
        </div>
      )}

      {/* 路線詳情彈窗 */}
      {selectedResult && (
        <RouteDetailModal
          route={selectedResult.route}
          matchedImageId={selectedResult.matchedImageId}
          getImageUrl={getImageUrl}
          onClose={() => setSelectedResult(null)}
          onAddImage={handleAddToRoute}
          showAddButton={imageBlob !== null && points.length > 0}
        />
      )}

      {/* 建立路線彈窗 */}
      {showCreateModal && (
        <CreateRouteModal
          onConfirm={handleCreateRoute}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {/* 路線清單彈窗 */}
      {showRouteList && (
        <RouteListModal
          routes={routes}
          getImageUrl={getImageUrl}
          onClose={() => setShowRouteList(false)}
          onDelete={handleDeleteRoute}
          onRouteClick={handleRouteListClick}
        />
      )}

      {/* 從路線清單查看路線詳情 */}
      {selectedRoute && (
        <RouteDetailModal
          route={selectedRoute}
          getImageUrl={getImageUrl}
          onClose={() => setSelectedRoute(null)}
          showAddButton={false}
        />
      )}

      {/* Toast 訊息 */}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

export default App;
