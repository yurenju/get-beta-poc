import type { Point, Route } from '../types/route';

/**
 * 搜尋結果
 */
export interface SearchResult {
  route: Route;
  similarity: number;
  matchedImageId: string;
}

/**
 * 計算兩點之間的歐式距離
 */
function distance(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * 計算陣列平均值
 */
function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * 正規化點集合（平移不變 + 縮放不變）
 * - 平移到重心
 * - 縮放到標準大小（RMS = 1）
 *
 * @param points 原始點集合
 * @returns 正規化後的點集合
 */
export function normalizePoints(points: Point[]): Point[] {
  // 邊界情況：0 或 1 個點
  if (points.length === 0) {
    return [];
  }
  if (points.length === 1) {
    return [{ x: 0, y: 0 }];
  }

  // 1. 計算重心
  const centroid: Point = {
    x: mean(points.map(p => p.x)),
    y: mean(points.map(p => p.y))
  };

  // 2. 平移到重心
  const centered = points.map(p => ({
    x: p.x - centroid.x,
    y: p.y - centroid.y
  }));

  // 3. 計算 RMS（均方根）
  const squaredDistances = centered.map(p => p.x * p.x + p.y * p.y);
  const rms = Math.sqrt(mean(squaredDistances));

  // 若 RMS 為 0（所有點重合），直接回傳置中的點
  if (rms === 0) {
    return centered;
  }

  // 4. 縮放到標準大小
  const normalized = centered.map(p => ({
    x: p.x / rms,
    y: p.y / rms
  }));

  return normalized;
}

/**
 * 計算 Modified Hausdorff Distance (MHD)
 *
 * MHD 是對傳統 Hausdorff 距離的改進：
 * - 傳統 HD：取最大最小距離（對雜訊敏感）
 * - MHD：取平均最小距離（更穩健）
 *
 * @param A 點集合 A（已正規化）
 * @param B 點集合 B（已正規化）
 * @returns MHD 距離值
 */
export function modifiedHausdorffDistance(A: Point[], B: Point[]): number {
  // 邊界情況
  if (A.length === 0 || B.length === 0) {
    return Infinity;
  }

  // 計算 A 到 B 的平均最小距離
  const forwardDistances = A.map(a =>
    Math.min(...B.map(b => distance(a, b)))
  );
  const forwardDist = mean(forwardDistances);

  // 計算 B 到 A 的平均最小距離
  const reverseDistances = B.map(b =>
    Math.min(...A.map(a => distance(a, b)))
  );
  const reverseDist = mean(reverseDistances);

  // 回傳兩者的最大值
  return Math.max(forwardDist, reverseDist);
}

/**
 * 將距離轉換為相似度百分比
 *
 * @param distance MHD 距離值
 * @param maxDistance 最大距離閾值（超過此值視為 0% 相似）
 * @returns 0-100 的相似度百分比
 */
export function distanceToSimilarity(distance: number, maxDistance: number = 0.5): number {
  if (distance >= maxDistance) {
    return 0;
  }
  const similarity = Math.max(0, 1 - distance / maxDistance);
  return Math.round(similarity * 100);
}

/**
 * 搜尋匹配的路線
 *
 * @param queryPoints 查詢的標記點（原始座標）
 * @param routes 路線資料庫
 * @param maxResults 最大回傳結果數（預設 10）
 * @returns 按相似度排序的搜尋結果
 */
export function searchRoutes(
  queryPoints: Point[],
  routes: Route[],
  maxResults: number = 10
): SearchResult[] {
  // 正規化查詢點
  const normalizedQuery = normalizePoints(queryPoints);

  // 對每條路線計算相似度
  const results: SearchResult[] = [];

  for (const route of routes) {
    let bestSimilarity = 0;
    let bestImageId = '';

    // 對每張圖片計算 MHD，取最高相似度
    for (const image of route.images) {
      const mhd = modifiedHausdorffDistance(normalizedQuery, image.normalizedPoints);
      const similarity = distanceToSimilarity(mhd);

      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestImageId = image.id;
      }
    }

    results.push({
      route,
      similarity: bestSimilarity,
      matchedImageId: bestImageId
    });
  }

  // 按相似度由高到低排序
  results.sort((a, b) => b.similarity - a.similarity);

  // 回傳前 N 名
  return results.slice(0, maxResults);
}
