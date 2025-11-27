import { useState, useEffect } from 'react';
import type { Route } from '../types/route';

interface RouteListModalProps {
  routes: Route[];
  getImageUrl: (filename: string) => Promise<string>;
  onClose: () => void;
  onDelete: (routeId: string) => Promise<void>;
  onRouteClick: (route: Route) => void;
}

/**
 * 路線清單彈窗
 */
export function RouteListModal({
  routes,
  getImageUrl,
  onClose,
  onDelete,
  onRouteClick
}: RouteListModalProps) {
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (routeId: string) => {
    setDeleting(true);
    try {
      await onDelete(routeId);
      setDeleteConfirm(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content route-list-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>所有路線</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          {routes.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#888', padding: '32px 0' }}>
              尚無儲存的路線
            </div>
          ) : (
            <div className="route-list">
              {routes.map(route => (
                <RouteListItem
                  key={route.id}
                  route={route}
                  getImageUrl={getImageUrl}
                  onClick={() => onRouteClick(route)}
                  onDeleteClick={() => setDeleteConfirm(route.id)}
                />
              ))}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            關閉
          </button>
        </div>

        {/* 刪除確認對話框 */}
        {deleteConfirm && (
          <div className="confirm-overlay" onClick={() => setDeleteConfirm(null)}>
            <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
              <p>確定要刪除這條路線嗎？</p>
              <p style={{ fontSize: '14px', color: '#666' }}>此操作無法復原</p>
              <div className="confirm-buttons">
                <button
                  className="btn-danger"
                  onClick={() => handleDelete(deleteConfirm)}
                  disabled={deleting}
                >
                  {deleting ? '刪除中...' : '確定刪除'}
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => setDeleteConfirm(null)}
                  disabled={deleting}
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface RouteListItemProps {
  route: Route;
  getImageUrl: (filename: string) => Promise<string>;
  onClick: () => void;
  onDeleteClick: () => void;
}

function RouteListItem({ route, getImageUrl, onClick, onDeleteClick }: RouteListItemProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const firstImage = route.images[0];

  useEffect(() => {
    if (firstImage) {
      getImageUrl(firstImage.filename)
        .then(setImageUrl)
        .catch(console.error);
    }
  }, [firstImage, getImageUrl]);

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  return (
    <div className="route-list-item">
      <div className="route-list-item-content" onClick={onClick}>
        <div className="route-list-item-thumbnail">
          {imageUrl ? (
            <img src={imageUrl} alt={route.name} />
          ) : (
            <div className="thumbnail-placeholder">載入中...</div>
          )}
        </div>
        <div className="route-list-item-info">
          <div className="route-list-item-name">{route.name}</div>
          <div className="route-list-item-meta">
            {route.images.length} 張照片 · {formatDate(route.createdAt)}
          </div>
        </div>
      </div>
      <button
        className="route-list-item-delete"
        onClick={e => {
          e.stopPropagation();
          onDeleteClick();
        }}
        title="刪除路線"
      >
        🗑️
      </button>
    </div>
  );
}
