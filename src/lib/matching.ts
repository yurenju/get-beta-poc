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
 * 匹配選項
 */
export interface MatchingOptions {
  /** MHD 最大距離閾值（超過此值視為 0% 相似），預設 0.6 */
  maxDistance?: number;
  /** MHD 權重，預設 0.6 */
  mhdWeight?: number;
  /** 順序匹配權重，預設 0.4 */
  orderWeight?: number;
}

const DEFAULT_OPTIONS: Required<MatchingOptions> = {
  maxDistance: 0.6,
  mhdWeight: 0.6,
  orderWeight: 0.4
};

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
 * @param maxDistance 最大距離閾值（超過此值視為 0% 相似），預設 0.6
 * @returns 0-100 的相似度百分比
 */
export function distanceToSimilarity(distance: number, maxDistance: number = 0.6): number {
  if (distance >= maxDistance) {
    return 0;
  }
  const similarity = Math.max(0, 1 - distance / maxDistance);
  return Math.round(similarity * 100);
}

/**
 * 計算 Dynamic Time Warping (DTW) 距離
 *
 * DTW 用於比較兩個序列，允許非線性對齊
 *
 * @param seqA 序列 A
 * @param seqB 序列 B
 * @returns 正規化後的 DTW 距離
 */
export function dtwDistance(seqA: number[], seqB: number[]): number {
  const n = seqA.length;
  const m = seqB.length;

  if (n === 0 || m === 0) return Infinity;

  // 建立 DTW 矩陣
  const dtw: number[][] = Array(n + 1)
    .fill(null)
    .map(() => Array(m + 1).fill(Infinity));
  dtw[0][0] = 0;

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = Math.abs(seqA[i - 1] - seqB[j - 1]);
      dtw[i][j] = cost + Math.min(
        dtw[i - 1][j],     // insertion
        dtw[i][j - 1],     // deletion
        dtw[i - 1][j - 1]  // match
      );
    }
  }

  // 正規化：除以較長序列的長度
  return dtw[n][m] / Math.max(n, m);
}

/**
 * 計算相對位置順序相似度
 *
 * 將點按 Y 座標排序後，比較 X 座標序列的相似度
 * 這個方法對透視變形有較好的容忍度
 *
 * @param pointsA 點集合 A
 * @param pointsB 點集合 B
 * @returns 0-100 的相似度百分比
 */
export function relativeOrderSimilarity(pointsA: Point[], pointsB: Point[]): number {
  if (pointsA.length === 0 || pointsB.length === 0) return 0;
  if (pointsA.length === 1 && pointsB.length === 1) return 100;

  // 1. 按 Y 座標排序
  const sortedA = [...pointsA].sort((a, b) => a.y - b.y);
  const sortedB = [...pointsB].sort((a, b) => a.y - b.y);

  // 2. 提取 X 座標
  const xSeqA = sortedA.map(p => p.x);
  const xSeqB = sortedB.map(p => p.x);

  // 3. 正規化到 0-1 範圍
  const normalize = (seq: number[]): number[] => {
    const min = Math.min(...seq);
    const max = Math.max(...seq);
    if (max === min) return seq.map(() => 0.5);
    return seq.map(x => (x - min) / (max - min));
  };

  const normA = normalize(xSeqA);
  const normB = normalize(xSeqB);

  // 4. 使用 DTW 計算距離
  const dist = dtwDistance(normA, normB);

  // 5. 轉換為相似度
  const maxDist = 1.0;
  if (dist >= maxDist) return 0;
  return Math.round((1 - dist / maxDist) * 100);
}

/**
 * 計算組合相似度
 *
 * 結合 MHD 相似度和順序相似度，取得更穩健的匹配結果
 *
 * @param mhdSimilarity MHD 相似度 (0-100)
 * @param orderSimilarity 順序相似度 (0-100)
 * @param weights 權重配置
 * @returns 0-100 的組合相似度
 */
export function combinedSimilarity(
  mhdSimilarity: number,
  orderSimilarity: number,
  weights: { mhd: number; order: number } = { mhd: 0.6, order: 0.4 }
): number {
  return Math.round(
    weights.mhd * mhdSimilarity +
    weights.order * orderSimilarity
  );
}

/**
 * 搜尋匹配的路線
 *
 * 使用組合演算法（MHD + 順序匹配）計算相似度，
 * 對不同拍攝角度的透視變形有更好的容忍度
 *
 * @param queryPoints 查詢的標記點（原始座標）
 * @param routes 路線資料庫
 * @param maxResults 最大回傳結果數（預設 10）
 * @param options 匹配選項（可選）
 * @returns 按相似度排序的搜尋結果
 */
export function searchRoutes(
  queryPoints: Point[],
  routes: Route[],
  maxResults: number = 10,
  options: MatchingOptions = {}
): SearchResult[] {
  // 合併預設選項
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // 正規化查詢點
  const normalizedQuery = normalizePoints(queryPoints);

  // 對每條路線計算相似度
  const results: SearchResult[] = [];

  for (const route of routes) {
    let bestSimilarity = 0;
    let bestImageId = '';

    // 對每張圖片計算組合相似度，取最高值
    for (const image of route.images) {
      // 計算 MHD 相似度
      const mhd = modifiedHausdorffDistance(normalizedQuery, image.normalizedPoints);
      const mhdSim = distanceToSimilarity(mhd, opts.maxDistance);

      // 計算順序相似度（使用原始點，因為順序匹配會自己做正規化）
      const orderSim = relativeOrderSimilarity(queryPoints, image.points);

      // 計算組合相似度
      const similarity = combinedSimilarity(mhdSim, orderSim, {
        mhd: opts.mhdWeight,
        order: opts.orderWeight
      });

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
