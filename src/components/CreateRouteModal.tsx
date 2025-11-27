import { useState } from 'react';

interface CreateRouteModalProps {
  onConfirm: (name: string) => void;
  onClose: () => void;
}

/**
 * 建立新路線彈窗
 */
export function CreateRouteModal({ onConfirm, onClose }: CreateRouteModalProps) {
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || submitting) return;

    setSubmitting(true);
    try {
      await onConfirm(name.trim());
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>建立新路線</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label htmlFor="route-name">路線名稱</label>
              <input
                id="route-name"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="請輸入路線名稱"
                autoFocus
                disabled={submitting}
              />
            </div>
          </div>
          <div className="modal-footer">
            <button
              type="submit"
              className="btn-primary"
              disabled={!name.trim() || submitting}
            >
              {submitting ? '建立中...' : '確認'}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={submitting}
            >
              取消
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
