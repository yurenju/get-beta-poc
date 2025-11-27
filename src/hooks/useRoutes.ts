import { useState, useEffect, useCallback } from 'react';
import type { Route, Point } from '../types/route';
import { initStorage, loadRoutes, saveRoutes, saveImage, loadImage, deleteImage } from '../lib/storage';
import { normalizePoints } from '../lib/matching';

interface UseRoutesReturn {
  routes: Route[];
  loading: boolean;
  error: string | null;
  addRoute: (name: string, imageBlob: Blob, points: Point[]) => Promise<Route>;
  addImageToRoute: (routeId: string, imageBlob: Blob, points: Point[]) => Promise<void>;
  deleteRoute: (routeId: string) => Promise<void>;
  getImageUrl: (filename: string) => Promise<string>;
  refresh: () => Promise<void>;
}

// 儲存已建立的 Blob URL，用於後續清理
const blobUrlCache = new Map<string, string>();

/**
 * 路線資料管理 Hook
 */
export function useRoutes(): UseRoutesReturn {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 初始化並載入資料
  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await initStorage();
      const data = await loadRoutes();
      setRoutes(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入失敗');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /**
   * 建立新路線
   */
  const addRoute = useCallback(async (
    name: string,
    imageBlob: Blob,
    points: Point[]
  ): Promise<Route> => {
    const routeId = crypto.randomUUID();
    const imageId = crypto.randomUUID();
    const filename = `${imageId}.jpg`;

    // 儲存圖片
    await saveImage(imageBlob, filename);

    // 建立路線資料
    const newRoute: Route = {
      id: routeId,
      name,
      images: [{
        id: imageId,
        filename,
        points,
        normalizedPoints: normalizePoints(points)
      }],
      createdAt: new Date().toISOString()
    };

    // 更新路線列表
    const updatedRoutes = [...routes, newRoute];
    await saveRoutes(updatedRoutes);
    setRoutes(updatedRoutes);

    return newRoute;
  }, [routes]);

  /**
   * 為現有路線新增圖片
   */
  const addImageToRoute = useCallback(async (
    routeId: string,
    imageBlob: Blob,
    points: Point[]
  ): Promise<void> => {
    const imageId = crypto.randomUUID();
    const filename = `${imageId}.jpg`;

    // 儲存圖片
    await saveImage(imageBlob, filename);

    // 更新路線資料
    const updatedRoutes = routes.map(route => {
      if (route.id === routeId) {
        return {
          ...route,
          images: [...route.images, {
            id: imageId,
            filename,
            points,
            normalizedPoints: normalizePoints(points)
          }]
        };
      }
      return route;
    });

    await saveRoutes(updatedRoutes);
    setRoutes(updatedRoutes);
  }, [routes]);

  /**
   * 刪除路線
   */
  const deleteRoute = useCallback(async (routeId: string): Promise<void> => {
    const route = routes.find(r => r.id === routeId);
    if (!route) return;

    // 刪除所有相關圖片
    for (const image of route.images) {
      // 清理 Blob URL 快取
      const cachedUrl = blobUrlCache.get(image.filename);
      if (cachedUrl) {
        URL.revokeObjectURL(cachedUrl);
        blobUrlCache.delete(image.filename);
      }
      // 刪除 OPFS 中的圖片
      await deleteImage(image.filename);
    }

    // 更新路線列表
    const updatedRoutes = routes.filter(r => r.id !== routeId);
    await saveRoutes(updatedRoutes);
    setRoutes(updatedRoutes);
  }, [routes]);

  /**
   * 取得圖片 URL（從 OPFS 載入並建立 Blob URL）
   */
  const getImageUrl = useCallback(async (filename: string): Promise<string> => {
    // 檢查快取
    const cached = blobUrlCache.get(filename);
    if (cached) {
      return cached;
    }

    // 從 OPFS 載入並建立 Blob URL
    const blob = await loadImage(filename);
    const url = URL.createObjectURL(blob);
    blobUrlCache.set(filename, url);
    return url;
  }, []);

  return {
    routes,
    loading,
    error,
    addRoute,
    addImageToRoute,
    deleteRoute,
    getImageUrl,
    refresh
  };
}
