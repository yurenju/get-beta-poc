/**
 * 測試額外的演算法方案
 * 1. 拓撲結構匹配（Delaunay 三角剖分）
 * 2. 仿射不變特徵（三角形面積比）
 * 3. 寬高比懲罰機制
 * 4. 角度分布特徵
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 資料結構
interface Point {
  x: number;
  y: number;
}

interface RouteImage {
  id: string;
  filename: string;
  points: Point[];
  normalizedPoints: Point[];
}

interface Route {
  id: string;
  name: string;
  images: RouteImage[];
  createdAt: string;
}

interface RouteData {
  routes: Route[];
}

// === 基礎工具函數 ===

function distance(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

// === 原始 MHD 演算法（作為基準） ===

function modifiedHausdorffDistance(A: Point[], B: Point[]): number {
  if (A.length === 0 || B.length === 0) return Infinity;

  const forwardDistances = A.map(a =>
    Math.min(...B.map(b => distance(a, b)))
  );
  const forwardDist = mean(forwardDistances);

  const reverseDistances = B.map(b =>
    Math.min(...A.map(a => distance(a, b)))
  );
  const reverseDist = mean(reverseDistances);

  return Math.max(forwardDist, reverseDist);
}

function distanceToSimilarity(dist: number, maxDistance: number = 0.5): number {
  if (dist >= maxDistance) return 0;
  const similarity = Math.max(0, 1 - dist / maxDistance);
  return Math.round(similarity * 100);
}

// === 方案一：拓撲結構匹配 ===

/**
 * 簡化版 Delaunay 三角剖分（使用最近鄰建立連接）
 * 返回每個點的鄰居索引
 */
function buildNeighborGraph(points: Point[], k: number = 3): number[][] {
  const n = points.length;
  const neighbors: number[][] = Array(n).fill(null).map(() => []);

  for (let i = 0; i < n; i++) {
    // 計算到所有其他點的距離
    const distances: { idx: number; dist: number }[] = [];
    for (let j = 0; j < n; j++) {
      if (i !== j) {
        distances.push({ idx: j, dist: distance(points[i], points[j]) });
      }
    }
    // 取最近的 k 個鄰居
    distances.sort((a, b) => a.dist - b.dist);
    neighbors[i] = distances.slice(0, Math.min(k, distances.length)).map(d => d.idx);
  }

  return neighbors;
}

/**
 * 計算點的相對位置編碼（上/下/左/右）
 */
function getRelativePositionCode(points: Point[]): string[] {
  const n = points.length;
  const codes: string[] = [];

  // 按 Y 座標排序，得到垂直順序
  const sortedByY = points.map((p, i) => ({ p, i })).sort((a, b) => a.p.y - b.p.y);
  const yRank = new Map<number, number>();
  sortedByY.forEach((item, rank) => yRank.set(item.i, rank));

  // 按 X 座標排序，得到水平順序
  const sortedByX = points.map((p, i) => ({ p, i })).sort((a, b) => a.p.x - b.p.x);
  const xRank = new Map<number, number>();
  sortedByX.forEach((item, rank) => xRank.set(item.i, rank));

  // 為每個點生成相對位置編碼
  for (let i = 0; i < n; i++) {
    const yr = yRank.get(i)!;
    const xr = xRank.get(i)!;
    // 將排名正規化到 0-9 的範圍
    const yCode = Math.floor((yr / n) * 10);
    const xCode = Math.floor((xr / n) * 10);
    codes.push(`${yCode}${xCode}`);
  }

  return codes.sort();
}

/**
 * 拓撲結構相似度：比較相對位置編碼的重疊程度
 */
function topologySimilarity(pointsA: Point[], pointsB: Point[]): number {
  const codesA = getRelativePositionCode(pointsA);
  const codesB = getRelativePositionCode(pointsB);

  // 計算編碼的重疊程度（使用集合交集）
  const setA = new Set(codesA);
  const setB = new Set(codesB);

  let matches = 0;
  for (const code of setA) {
    if (setB.has(code)) matches++;
  }

  const similarity = (2 * matches) / (setA.size + setB.size);
  return Math.round(similarity * 100);
}

// === 方案二：仿射不變特徵（三角形面積比） ===

/**
 * 計算三角形面積（使用叉積）
 */
function triangleArea(p1: Point, p2: Point, p3: Point): number {
  return Math.abs(
    (p2.x - p1.x) * (p3.y - p1.y) - (p3.x - p1.x) * (p2.y - p1.y)
  ) / 2;
}

/**
 * 計算所有三角形面積比的分布
 * 面積比對仿射變換不變
 */
function getAreaRatioHistogram(points: Point[], bins: number = 10): number[] {
  const n = points.length;
  if (n < 3) return Array(bins).fill(0);

  const areas: number[] = [];

  // 計算所有三點組合的三角形面積
  for (let i = 0; i < n - 2; i++) {
    for (let j = i + 1; j < n - 1; j++) {
      for (let k = j + 1; k < n; k++) {
        const area = triangleArea(points[i], points[j], points[k]);
        if (area > 0.0001) { // 忽略面積太小的
          areas.push(area);
        }
      }
    }
  }

  if (areas.length === 0) return Array(bins).fill(0);

  // 正規化面積（除以最大面積）
  const maxArea = Math.max(...areas);
  const normalizedAreas = areas.map(a => a / maxArea);

  // 建立直方圖
  const histogram = Array(bins).fill(0);
  for (const area of normalizedAreas) {
    const bin = Math.min(bins - 1, Math.floor(area * bins));
    histogram[bin]++;
  }

  // 正規化直方圖
  const total = histogram.reduce((a, b) => a + b, 0);
  return histogram.map(h => h / total);
}

/**
 * 比較兩個直方圖的相似度（使用直方圖交集）
 */
function histogramIntersection(h1: number[], h2: number[]): number {
  let intersection = 0;
  for (let i = 0; i < h1.length; i++) {
    intersection += Math.min(h1[i], h2[i]);
  }
  return intersection;
}

/**
 * 仿射不變特徵相似度
 */
function affineInvariantSimilarity(pointsA: Point[], pointsB: Point[]): number {
  const histA = getAreaRatioHistogram(pointsA);
  const histB = getAreaRatioHistogram(pointsB);

  const similarity = histogramIntersection(histA, histB);
  return Math.round(similarity * 100);
}

// === 方案三：寬高比懲罰 ===

/**
 * 計算點集的寬高比
 */
function getAspectRatio(points: Point[]): number {
  if (points.length < 2) return 1;

  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);

  const width = Math.max(...xs) - Math.min(...xs);
  const height = Math.max(...ys) - Math.min(...ys);

  if (height === 0) return Infinity;
  return width / height;
}

/**
 * 帶寬高比懲罰的相似度
 */
function aspectRatioPenaltySimilarity(
  normalizedA: Point[],
  normalizedB: Point[],
  rawA: Point[],
  rawB: Point[],
  maxDistance: number = 0.5
): number {
  const mhdDist = modifiedHausdorffDistance(normalizedA, normalizedB);
  let baseSimilarity = distanceToSimilarity(mhdDist, maxDistance);

  const arA = getAspectRatio(rawA);
  const arB = getAspectRatio(rawB);

  // 計算寬高比差異
  const aspectDiff = Math.abs(arA - arB) / Math.max(arA, arB);

  // 寬高比差異超過 30% 時開始懲罰
  if (aspectDiff > 0.3) {
    const penalty = Math.min(0.5, (aspectDiff - 0.3) * 0.5);
    baseSimilarity = Math.round(baseSimilarity * (1 - penalty));
  }

  return baseSimilarity;
}

// === 方案四：角度分布特徵 ===

/**
 * 計算點相對於重心的角度分布
 */
function getAngleDistribution(points: Point[], bins: number = 8): number[] {
  if (points.length < 2) return Array(bins).fill(0);

  // 計算重心
  const cx = mean(points.map(p => p.x));
  const cy = mean(points.map(p => p.y));

  // 計算每個點相對於重心的角度
  const angles = points.map(p => Math.atan2(p.y - cy, p.x - cx));

  // 建立角度直方圖（-π 到 π 分成 bins 個區間）
  const histogram = Array(bins).fill(0);
  for (const angle of angles) {
    const normalizedAngle = (angle + Math.PI) / (2 * Math.PI); // 0 到 1
    const bin = Math.min(bins - 1, Math.floor(normalizedAngle * bins));
    histogram[bin]++;
  }

  // 正規化
  const total = histogram.reduce((a, b) => a + b, 0);
  return histogram.map(h => h / total);
}

/**
 * 角度分布相似度（對旋轉敏感，但對縮放和平移不變）
 */
function angleDistributionSimilarity(pointsA: Point[], pointsB: Point[]): number {
  const histA = getAngleDistribution(pointsA);
  const histB = getAngleDistribution(pointsB);

  // 嘗試所有旋轉對齊，取最佳匹配
  let bestSimilarity = 0;
  for (let shift = 0; shift < histA.length; shift++) {
    const shiftedB = [...histB.slice(shift), ...histB.slice(0, shift)];
    const similarity = histogramIntersection(histA, shiftedB);
    bestSimilarity = Math.max(bestSimilarity, similarity);
  }

  return Math.round(bestSimilarity * 100);
}

// === 方案五：距離比特徵 ===

/**
 * 計算所有點對距離的排序序列
 */
function getDistanceRatioSignature(points: Point[]): number[] {
  const n = points.length;
  if (n < 2) return [];

  const distances: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    for (let j = i + 1; j < n; j++) {
      distances.push(distance(points[i], points[j]));
    }
  }

  // 排序並正規化
  distances.sort((a, b) => a - b);
  const maxDist = distances[distances.length - 1];
  if (maxDist === 0) return distances;

  return distances.map(d => d / maxDist);
}

/**
 * 距離比相似度（對縮放不變）
 */
function distanceRatioSimilarity(pointsA: Point[], pointsB: Point[]): number {
  const sigA = getDistanceRatioSignature(pointsA);
  const sigB = getDistanceRatioSignature(pointsB);

  if (sigA.length === 0 || sigB.length === 0) return 0;

  // 如果長度不同，使用 DTW
  if (sigA.length !== sigB.length) {
    return dtwSimilarity(sigA, sigB);
  }

  // 長度相同，直接比較
  let sumDiff = 0;
  for (let i = 0; i < sigA.length; i++) {
    sumDiff += Math.abs(sigA[i] - sigB[i]);
  }

  const avgDiff = sumDiff / sigA.length;
  return Math.round(Math.max(0, 1 - avgDiff * 2) * 100);
}

/**
 * DTW 相似度
 */
function dtwSimilarity(seqA: number[], seqB: number[]): number {
  const n = seqA.length;
  const m = seqB.length;

  const dtw: number[][] = Array(n + 1).fill(null).map(() =>
    Array(m + 1).fill(Infinity)
  );
  dtw[0][0] = 0;

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = Math.abs(seqA[i - 1] - seqB[j - 1]);
      dtw[i][j] = cost + Math.min(
        dtw[i - 1][j],
        dtw[i][j - 1],
        dtw[i - 1][j - 1]
      );
    }
  }

  const avgDist = dtw[n][m] / Math.max(n, m);
  return Math.round(Math.max(0, 1 - avgDist) * 100);
}

// === 方案六：凸包形狀比較 ===

/**
 * 計算凸包（Graham scan 簡化版）
 */
function convexHull(points: Point[]): Point[] {
  if (points.length < 3) return points;

  // 找最下方的點
  const sorted = [...points].sort((a, b) => a.y - b.y || a.x - b.x);
  const start = sorted[0];

  // 按極角排序
  const rest = sorted.slice(1).sort((a, b) => {
    const angleA = Math.atan2(a.y - start.y, a.x - start.x);
    const angleB = Math.atan2(b.y - start.y, b.x - start.x);
    return angleA - angleB;
  });

  const hull: Point[] = [start];

  for (const p of rest) {
    while (hull.length > 1) {
      const top = hull[hull.length - 1];
      const second = hull[hull.length - 2];
      const cross = (top.x - second.x) * (p.y - second.y) -
                   (top.y - second.y) * (p.x - second.x);
      if (cross <= 0) {
        hull.pop();
      } else {
        break;
      }
    }
    hull.push(p);
  }

  return hull;
}

/**
 * 凸包形狀相似度
 */
function convexHullSimilarity(pointsA: Point[], pointsB: Point[]): number {
  const hullA = convexHull(pointsA);
  const hullB = convexHull(pointsB);

  // 比較凸包的點數比例
  const hullRatioA = hullA.length / pointsA.length;
  const hullRatioB = hullB.length / pointsB.length;
  const ratioSimilarity = 1 - Math.abs(hullRatioA - hullRatioB);

  // 比較凸包面積比
  const areaA = polygonArea(hullA);
  const areaB = polygonArea(hullB);
  const totalAreaA = boundingBoxArea(pointsA);
  const totalAreaB = boundingBoxArea(pointsB);

  const fillRatioA = areaA / totalAreaA;
  const fillRatioB = areaB / totalAreaB;
  const fillSimilarity = 1 - Math.abs(fillRatioA - fillRatioB);

  return Math.round((ratioSimilarity * 0.5 + fillSimilarity * 0.5) * 100);
}

function polygonArea(vertices: Point[]): number {
  let area = 0;
  const n = vertices.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += vertices[i].x * vertices[j].y;
    area -= vertices[j].x * vertices[i].y;
  }
  return Math.abs(area) / 2;
}

function boundingBoxArea(points: Point[]): number {
  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  const width = Math.max(...xs) - Math.min(...xs);
  const height = Math.max(...ys) - Math.min(...ys);
  return width * height || 1;
}

// === 組合方案 ===

/**
 * 相對位置順序匹配（從之前的測試中）
 */
function relativeOrderSimilarity(pointsA: Point[], pointsB: Point[]): number {
  if (pointsA.length < 2 || pointsB.length < 2) return 0;

  const getOrderedXSequence = (points: Point[]): number[] => {
    const sorted = [...points].sort((a, b) => a.y - b.y);
    return sorted.map(p => p.x);
  };

  const seqA = getOrderedXSequence(pointsA);
  const seqB = getOrderedXSequence(pointsB);

  const normalizeSeq = (seq: number[]): number[] => {
    const min = Math.min(...seq);
    const max = Math.max(...seq);
    const range = max - min;
    if (range === 0) return seq.map(() => 0.5);
    return seq.map(x => (x - min) / range);
  };

  const normA = normalizeSeq(seqA);
  const normB = normalizeSeq(seqB);

  return dtwSimilarity(normA, normB);
}

/**
 * 多特徵組合
 */
function multiFeatureSimilarity(
  normalizedA: Point[],
  normalizedB: Point[],
  rawA: Point[],
  rawB: Point[]
): number {
  const mhdDist = modifiedHausdorffDistance(normalizedA, normalizedB);
  const mhdSim = distanceToSimilarity(mhdDist, 0.6);

  const orderSim = relativeOrderSimilarity(rawA, rawB);
  const distRatioSim = distanceRatioSimilarity(rawA, rawB);
  const affineInvSim = affineInvariantSimilarity(rawA, rawB);

  // 加權組合
  return Math.round(
    mhdSim * 0.4 +
    orderSim * 0.3 +
    distRatioSim * 0.2 +
    affineInvSim * 0.1
  );
}

// === 測試框架 ===

interface TestResult {
  routeName: string;
  similarity: number;
}

function testAlgorithm(
  routes: Route[],
  algorithm: (imgA: RouteImage, imgB: RouteImage) => number
): { intra: TestResult[]; inter: TestResult[] } {
  const intra: TestResult[] = [];
  const inter: TestResult[] = [];

  // 同路線測試
  for (const route of routes) {
    if (route.images.length < 2) continue;
    for (let i = 0; i < route.images.length; i++) {
      for (let j = i + 1; j < route.images.length; j++) {
        const similarity = algorithm(route.images[i], route.images[j]);
        intra.push({ routeName: route.name, similarity });
      }
    }
  }

  // 跨路線測試
  for (let i = 0; i < routes.length; i++) {
    for (let j = i + 1; j < routes.length; j++) {
      if (routes[i].images.length === 0 || routes[j].images.length === 0) continue;
      const similarity = algorithm(routes[i].images[0], routes[j].images[0]);
      inter.push({
        routeName: `${routes[i].name} vs ${routes[j].name}`,
        similarity
      });
    }
  }

  return { intra, inter };
}

function printResults(name: string, intra: TestResult[], inter: TestResult[]): void {
  const intraAvg = mean(intra.map(r => r.similarity));
  const intraMin = Math.min(...intra.map(r => r.similarity));
  const intraMax = Math.max(...intra.map(r => r.similarity));
  const interAvg = mean(inter.map(r => r.similarity));
  const interMax = Math.max(...inter.map(r => r.similarity));
  const gap = intraAvg - interAvg;

  console.log(`\n${name}`);
  console.log('-'.repeat(60));
  console.log(`同路線: 平均=${intraAvg.toFixed(1)}%, 最低=${intraMin}%, 最高=${intraMax}%`);
  console.log(`跨路線: 平均=${interAvg.toFixed(1)}%, 最高=${interMax}%`);
  console.log(`區分差距: ${gap.toFixed(1)}% ${gap > 30 ? '✅' : gap > 20 ? '⚠️' : '❌'}`);

  // 顯示同路線各項詳情
  console.log(`詳情: ${intra.map(r => `${r.routeName.substring(0, 4)}:${r.similarity}%`).join(', ')}`);
}

// === 主程式 ===

const dataPath = path.join(__dirname, '../docs/research/route-dataset-2025-11-29 (1)/routes.json');
const data: RouteData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

console.log('╔══════════════════════════════════════════════════════════════════════╗');
console.log('║          額外演算法測試                                              ║');
console.log('╚══════════════════════════════════════════════════════════════════════╝');

// 基準：原始 MHD
{
  const { intra, inter } = testAlgorithm(data.routes, (imgA, imgB) => {
    const mhd = modifiedHausdorffDistance(imgA.normalizedPoints, imgB.normalizedPoints);
    return distanceToSimilarity(mhd, 0.5);
  });
  printResults('【基準】MHD (maxDist=0.5)', intra, inter);
}

// 方案一：拓撲結構匹配
{
  const { intra, inter } = testAlgorithm(data.routes, (imgA, imgB) => {
    return topologySimilarity(imgA.points, imgB.points);
  });
  printResults('【方案一】拓撲結構匹配（相對位置編碼）', intra, inter);
}

// 方案二：仿射不變特徵
{
  const { intra, inter } = testAlgorithm(data.routes, (imgA, imgB) => {
    return affineInvariantSimilarity(imgA.points, imgB.points);
  });
  printResults('【方案二】仿射不變特徵（三角形面積比）', intra, inter);
}

// 方案三：寬高比懲罰
{
  const { intra, inter } = testAlgorithm(data.routes, (imgA, imgB) => {
    return aspectRatioPenaltySimilarity(
      imgA.normalizedPoints, imgB.normalizedPoints,
      imgA.points, imgB.points, 0.5
    );
  });
  printResults('【方案三】MHD + 寬高比懲罰', intra, inter);
}

// 方案四：角度分布
{
  const { intra, inter } = testAlgorithm(data.routes, (imgA, imgB) => {
    return angleDistributionSimilarity(imgA.points, imgB.points);
  });
  printResults('【方案四】角度分布特徵', intra, inter);
}

// 方案五：距離比
{
  const { intra, inter } = testAlgorithm(data.routes, (imgA, imgB) => {
    return distanceRatioSimilarity(imgA.points, imgB.points);
  });
  printResults('【方案五】距離比特徵', intra, inter);
}

// 方案六：凸包形狀
{
  const { intra, inter } = testAlgorithm(data.routes, (imgA, imgB) => {
    return convexHullSimilarity(imgA.points, imgB.points);
  });
  printResults('【方案六】凸包形狀比較', intra, inter);
}

// 方案七：多特徵組合
{
  const { intra, inter } = testAlgorithm(data.routes, (imgA, imgB) => {
    return multiFeatureSimilarity(
      imgA.normalizedPoints, imgB.normalizedPoints,
      imgA.points, imgB.points
    );
  });
  printResults('【方案七】多特徵組合 (MHD+順序+距離比+仿射)', intra, inter);
}

// 最終總結
console.log('\n' + '═'.repeat(70));
console.log('總結比較表');
console.log('═'.repeat(70));

interface Summary {
  name: string;
  intraAvg: number;
  intraMin: number;
  interAvg: number;
  gap: number;
}

const algorithms: { name: string; fn: (imgA: RouteImage, imgB: RouteImage) => number }[] = [
  {
    name: 'MHD 原始',
    fn: (imgA, imgB) => distanceToSimilarity(
      modifiedHausdorffDistance(imgA.normalizedPoints, imgB.normalizedPoints), 0.5
    )
  },
  {
    name: '拓撲結構',
    fn: (imgA, imgB) => topologySimilarity(imgA.points, imgB.points)
  },
  {
    name: '仿射不變',
    fn: (imgA, imgB) => affineInvariantSimilarity(imgA.points, imgB.points)
  },
  {
    name: 'MHD+寬高比懲罰',
    fn: (imgA, imgB) => aspectRatioPenaltySimilarity(
      imgA.normalizedPoints, imgB.normalizedPoints,
      imgA.points, imgB.points, 0.5
    )
  },
  {
    name: '角度分布',
    fn: (imgA, imgB) => angleDistributionSimilarity(imgA.points, imgB.points)
  },
  {
    name: '距離比',
    fn: (imgA, imgB) => distanceRatioSimilarity(imgA.points, imgB.points)
  },
  {
    name: '凸包形狀',
    fn: (imgA, imgB) => convexHullSimilarity(imgA.points, imgB.points)
  },
  {
    name: '多特徵組合',
    fn: (imgA, imgB) => multiFeatureSimilarity(
      imgA.normalizedPoints, imgB.normalizedPoints,
      imgA.points, imgB.points
    )
  },
  {
    name: 'MHD+順序(之前最佳)',
    fn: (imgA, imgB) => {
      const mhdDist = modifiedHausdorffDistance(imgA.normalizedPoints, imgB.normalizedPoints);
      const mhdSim = distanceToSimilarity(mhdDist, 0.6);
      const orderSim = relativeOrderSimilarity(imgA.points, imgB.points);
      return Math.round(0.6 * mhdSim + 0.4 * orderSim);
    }
  },
];

const summaries: Summary[] = [];
for (const algo of algorithms) {
  const { intra, inter } = testAlgorithm(data.routes, algo.fn);
  summaries.push({
    name: algo.name,
    intraAvg: mean(intra.map(r => r.similarity)),
    intraMin: Math.min(...intra.map(r => r.similarity)),
    interAvg: mean(inter.map(r => r.similarity)),
    gap: mean(intra.map(r => r.similarity)) - mean(inter.map(r => r.similarity))
  });
}

console.log('\n| 演算法 | 同路線平均 | 同路線最低 | 跨路線平均 | 區分差距 | 評估 |');
console.log('|--------|-----------|-----------|-----------|---------|------|');
for (const s of summaries) {
  const eval_ = s.gap > 35 && s.intraMin > 50 ? '✅ 推薦' :
                s.gap > 25 && s.intraMin > 40 ? '⚠️ 可用' : '❌ 不佳';
  console.log(`| ${s.name.padEnd(18)} | ${s.intraAvg.toFixed(1).padStart(9)}% | ${String(s.intraMin).padStart(9)}% | ${s.interAvg.toFixed(1).padStart(9)}% | ${s.gap.toFixed(1).padStart(7)}% | ${eval_} |`);
}
