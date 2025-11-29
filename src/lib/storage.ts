import type { Route, RoutesData } from '../types/route';

const ROUTES_FILE = 'routes.json';
const IMAGES_DIR = 'images';

/**
 * 取得 OPFS 根目錄
 */
async function getRoot(): Promise<FileSystemDirectoryHandle> {
  return await navigator.storage.getDirectory();
}

/**
 * 初始化 OPFS 目錄結構
 */
export async function initStorage(): Promise<void> {
  const root = await getRoot();
  // 建立 images 目錄（如果不存在）
  await root.getDirectoryHandle(IMAGES_DIR, { create: true });
}

/**
 * 從 OPFS 讀取路線資料
 * @returns 路線陣列，若檔案不存在則回傳空陣列
 */
export async function loadRoutes(): Promise<Route[]> {
  try {
    const root = await getRoot();
    const fileHandle = await root.getFileHandle(ROUTES_FILE);
    const file = await fileHandle.getFile();
    const text = await file.text();
    const data: RoutesData = JSON.parse(text);
    return data.routes;
  } catch (error) {
    // 檔案不存在時回傳空陣列
    if (error instanceof DOMException && error.name === 'NotFoundError') {
      return [];
    }
    throw error;
  }
}

/**
 * 將路線資料寫入 OPFS
 * @param routes 路線陣列
 */
export async function saveRoutes(routes: Route[]): Promise<void> {
  const root = await getRoot();
  const fileHandle = await root.getFileHandle(ROUTES_FILE, { create: true });
  const writable = await fileHandle.createWritable();
  const data: RoutesData = { routes };
  await writable.write(JSON.stringify(data, null, 2));
  await writable.close();
}

/**
 * 將圖片儲存到 OPFS
 * @param blob 圖片 Blob
 * @param filename 檔案名稱
 */
export async function saveImage(blob: Blob, filename: string): Promise<void> {
  const root = await getRoot();
  const imagesDir = await root.getDirectoryHandle(IMAGES_DIR, { create: true });
  const fileHandle = await imagesDir.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(blob);
  await writable.close();
}

/**
 * 從 OPFS 讀取圖片
 * @param filename 檔案名稱
 * @returns 圖片 Blob
 */
export async function loadImage(filename: string): Promise<Blob> {
  const root = await getRoot();
  const imagesDir = await root.getDirectoryHandle(IMAGES_DIR);
  const fileHandle = await imagesDir.getFileHandle(filename);
  const file = await fileHandle.getFile();
  return file;
}

/**
 * 從 OPFS 刪除圖片
 * @param filename 檔案名稱
 */
export async function deleteImage(filename: string): Promise<void> {
  try {
    const root = await getRoot();
    const imagesDir = await root.getDirectoryHandle(IMAGES_DIR);
    await imagesDir.removeEntry(filename);
  } catch (error) {
    // 如果檔案不存在，忽略錯誤
    if (error instanceof DOMException && error.name === 'NotFoundError') {
      return;
    }
    throw error;
  }
}

/**
 * 匯出所有資料為 ZIP 檔案
 * @returns ZIP Blob
 */
export async function exportDataset(): Promise<Blob> {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();

  // 載入路線資料
  const routes = await loadRoutes();
  zip.file('routes.json', JSON.stringify({ routes }, null, 2));

  // 載入所有圖片
  const imagesFolder = zip.folder('images');
  if (imagesFolder) {
    for (const route of routes) {
      for (const image of route.images) {
        try {
          const blob = await loadImage(image.filename);
          imagesFolder.file(image.filename, blob);
        } catch {
          // 圖片不存在則跳過
        }
      }
    }
  }

  return await zip.generateAsync({ type: 'blob' });
}

/**
 * 清除所有資料（路線和圖片）
 */
export async function clearAllData(): Promise<void> {
  const root = await getRoot();

  // 刪除 routes.json
  try {
    await root.removeEntry(ROUTES_FILE);
  } catch {
    // 檔案不存在則跳過
  }

  // 刪除 images 目錄
  try {
    await root.removeEntry(IMAGES_DIR, { recursive: true });
  } catch {
    // 目錄不存在則跳過
  }

  // 重新建立 images 目錄
  await root.getDirectoryHandle(IMAGES_DIR, { create: true });
}
