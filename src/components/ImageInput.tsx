import { useRef } from 'react';

interface ImageInputProps {
  onImageSelect: (blob: Blob, url: string) => void;
}

/**
 * 圖片輸入元件
 * - 提供「拍照」和「上傳圖片」兩個按鈕
 * - 選擇後將圖片轉為 Blob URL 並透過 callback 傳出
 */
export function ImageInput({ onImageSelect }: ImageInputProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      onImageSelect(file, url);
    }
    // 重設 input 以便可以再次選擇相同檔案
    e.target.value = '';
  };

  return (
    <div className="image-input" style={{ display: 'flex', gap: '8px' }}>
      {/* 拍照按鈕 */}
      <button
        type="button"
        onClick={() => cameraInputRef.current?.click()}
        style={{
          padding: '8px 16px',
          fontSize: '16px',
          cursor: 'pointer'
        }}
      >
        📷 拍照
      </button>
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {/* 上傳按鈕 */}
      <button
        type="button"
        onClick={() => uploadInputRef.current?.click()}
        style={{
          padding: '8px 16px',
          fontSize: '16px',
          cursor: 'pointer'
        }}
      >
        📁 上傳圖片
      </button>
      <input
        ref={uploadInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
    </div>
  );
}
