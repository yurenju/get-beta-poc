/**
 * 測試腳本：比較不同 maxDistance 參數和順序感知匹配演算法的效果
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

function normalizePoints(points: Point[]): Point[] {
  if (points.length === 0) return [];
  if (points.length === 1) return [{ x: 0, y: 0 }];

  const centroid: Point = {
    x: mean(points.map(p => p.x)),
    y: mean(points.map(p => p.y))
  };

  const centered = points.map(p => ({
    x: p.x - centroid.x,
    y: p.y - centroid.y
  }));

  const squaredDistances = centered.map(p => p.x * p.x + p.y * p.y);
  const rms = Math.sqrt(mean(squaredDistances));

  if (rms === 0) return centered;

  return centered.map(p => ({
    x: p.x / rms,
    y: p.y / rms
  }));
}

// === 原始 MHD 演算法 ===

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

// === 順序感知匹配演算法 ===

/**
 * 將點按 Y 座標排序並提取 X 位置序列
 */
function getOrderedXSequence(points: Point[]): number[] {
  // 按 Y 座標排序（假設 Y 較小的在上方）
  const sorted = [...points].sort((a, b) => a.y - b.y);
  return sorted.map(p => p.x);
}

/**
 * Dynamic Time Warping (DTW) 距離
 * 用於比較兩個可能長度不同的序列
 */
function dtwDistance(seqA: number[], seqB: number[]): number {
  const n = seqA.length;
  const m = seqB.length;

  if (n === 0 || m === 0) return Infinity;

  // 建立 DTW 矩陣
  const dtw: number[][] = Array(n + 1).fill(null).map(() =>
    Array(m + 1).fill(Infinity)
  );
  dtw[0][0] = 0;

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = Math.abs(seqA[i - 1] - seqB[j - 1]);
      dtw[i][j] = cost + Math.min(
        dtw[i - 1][j],     // 插入
        dtw[i][j - 1],     // 刪除
        dtw[i - 1][j - 1]  // 匹配
      );
    }
  }

  // 正規化：除以路徑長度
  return dtw[n][m] / Math.max(n, m);
}

/**
 * 順序感知匹配：比較兩組點的垂直順序一致性
 */
function orderAwareSimilarity(pointsA: Point[], pointsB: Point[], maxDist: number = 0.5): number {
  const seqA = getOrderedXSequence(pointsA);
  const seqB = getOrderedXSequence(pointsB);

  const dtwDist = dtwDistance(seqA, seqB);

  // 轉換為相似度（DTW 距離通常在 0-1 之間，因為 x 座標是正規化的）
  if (dtwDist >= maxDist) return 0;
  return Math.round((1 - dtwDist / maxDist) * 100);
}

/**
 * 相對位置順序匹配：比較點的相對垂直順序
 */
function relativeOrderSimilarity(pointsA: Point[], pointsB: Point[]): number {
  if (pointsA.length < 2 || pointsB.length < 2) return 0;

  // 取得排序後的 X 位置
  const seqA = getOrderedXSequence(pointsA);
  const seqB = getOrderedXSequence(pointsB);

  // 計算相對位置（每個點相對於序列的位置，0-1 範圍）
  const normalizeSeq = (seq: number[]): number[] => {
    const min = Math.min(...seq);
    const max = Math.max(...seq);
    const range = max - min;
    if (range === 0) return seq.map(() => 0.5);
    return seq.map(x => (x - min) / range);
  };

  const normA = normalizeSeq(seqA);
  const normB = normalizeSeq(seqB);

  // 使用 DTW 比較正規化後的序列
  const dtwDist = dtwDistance(normA, normB);

  // DTW 距離在 0-1 之間，轉換為相似度
  return Math.round(Math.max(0, 1 - dtwDist) * 100);
}

/**
 * 組合匹配：結合 MHD 和順序感知
 */
function combinedSimilarity(
  normalizedA: Point[],
  normalizedB: Point[],
  rawA: Point[],
  rawB: Point[],
  maxDistance: number = 0.5,
  weights: { mhd: number; order: number } = { mhd: 0.6, order: 0.4 }
): number {
  const mhdDist = modifiedHausdorffDistance(normalizedA, normalizedB);
  const mhdSim = distanceToSimilarity(mhdDist, maxDistance);

  const orderSim = relativeOrderSimilarity(rawA, rawB);

  return Math.round(weights.mhd * mhdSim + weights.order * orderSim);
}

// === 測試框架 ===

interface TestResult {
  routeName: string;
  imgA: string;
  imgB: string;
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
        intra.push({
          routeName: route.name,
          imgA: route.images[i].id.substring(0, 8),
          imgB: route.images[j].id.substring(0, 8),
          similarity
        });
      }
    }
  }

  // 跨路線測試（只取第一張圖）
  for (let i = 0; i < routes.length; i++) {
    for (let j = i + 1; j < routes.length; j++) {
      if (routes[i].images.length === 0 || routes[j].images.length === 0) continue;
      const similarity = algorithm(routes[i].images[0], routes[j].images[0]);
      inter.push({
        routeName: `${routes[i].name} vs ${routes[j].name}`,
        imgA: routes[i].images[0].id.substring(0, 8),
        imgB: routes[j].images[0].id.substring(0, 8),
        similarity
      });
    }
  }

  return { intra, inter };
}

function printResults(name: string, intra: TestResult[], inter: TestResult[]): void {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`演算法: ${name}`);
  console.log('='.repeat(70));

  console.log('\n【同路線相似度】');
  intra.forEach(r => {
    const status = r.similarity >= 70 ? '✅' : r.similarity >= 50 ? '⚠️' : '❌';
    console.log(`  ${status} ${r.routeName}: ${r.similarity}%`);
  });

  const intraAvg = mean(intra.map(r => r.similarity));
  const intraMin = Math.min(...intra.map(r => r.similarity));
  const intraMax = Math.max(...intra.map(r => r.similarity));

  console.log(`\n  統計: 平均=${intraAvg.toFixed(1)}%, 最低=${intraMin}%, 最高=${intraMax}%`);

  console.log('\n【跨路線相似度（前 5 高）】');
  const topInter = [...inter].sort((a, b) => b.similarity - a.similarity).slice(0, 5);
  topInter.forEach(r => {
    const status = r.similarity <= 30 ? '✅' : r.similarity <= 50 ? '⚠️' : '❌';
    console.log(`  ${status} ${r.routeName}: ${r.similarity}%`);
  });

  const interAvg = mean(inter.map(r => r.similarity));
  const interMax = Math.max(...inter.map(r => r.similarity));

  console.log(`\n  統計: 平均=${interAvg.toFixed(1)}%, 最高=${interMax}%`);

  const gap = intraAvg - interAvg;
  const discrimination = gap > 40 ? '✅ 優秀' : gap > 30 ? '✅ 良好' : gap > 20 ? '⚠️ 一般' : '❌ 不足';

  console.log(`\n【區分能力】`);
  console.log(`  同路線平均 - 跨路線平均 = ${gap.toFixed(1)}% ${discrimination}`);
}

// === 主程式 ===

const dataPath = path.join(__dirname, '../docs/research/route-dataset-2025-11-29 (1)/routes.json');
const data: RouteData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

console.log('╔══════════════════════════════════════════════════════════════════════╗');
console.log('║          路線匹配演算法比較測試                                      ║');
console.log('╠══════════════════════════════════════════════════════════════════════╣');
console.log(`║  測試資料: ${data.routes.length} 條路線                                               ║`);
console.log('╚══════════════════════════════════════════════════════════════════════╝');

// 測試 1: 不同 maxDistance 參數
console.log('\n\n' + '#'.repeat(70));
console.log('# 第一部分：測試不同 maxDistance 參數');
console.log('#'.repeat(70));

const maxDistances = [0.4, 0.5, 0.6, 0.7, 0.8, 1.0];

for (const maxDist of maxDistances) {
  const { intra, inter } = testAlgorithm(data.routes, (imgA, imgB) => {
    const mhd = modifiedHausdorffDistance(imgA.normalizedPoints, imgB.normalizedPoints);
    return distanceToSimilarity(mhd, maxDist);
  });
  printResults(`MHD (maxDistance=${maxDist})`, intra, inter);
}

// 測試 2: 順序感知匹配
console.log('\n\n' + '#'.repeat(70));
console.log('# 第二部分：順序感知匹配演算法');
console.log('#'.repeat(70));

// 2a. 純 DTW 順序匹配
{
  const { intra, inter } = testAlgorithm(data.routes, (imgA, imgB) => {
    return orderAwareSimilarity(imgA.points, imgB.points, 0.5);
  });
  printResults('DTW 順序匹配 (maxDist=0.5)', intra, inter);
}

// 2b. 相對位置順序匹配
{
  const { intra, inter } = testAlgorithm(data.routes, (imgA, imgB) => {
    return relativeOrderSimilarity(imgA.points, imgB.points);
  });
  printResults('相對位置順序匹配', intra, inter);
}

// 測試 3: 組合演算法
console.log('\n\n' + '#'.repeat(70));
console.log('# 第三部分：組合演算法');
console.log('#'.repeat(70));

const weightConfigs = [
  { mhd: 0.7, order: 0.3 },
  { mhd: 0.6, order: 0.4 },
  { mhd: 0.5, order: 0.5 },
  { mhd: 0.4, order: 0.6 },
];

for (const weights of weightConfigs) {
  const { intra, inter } = testAlgorithm(data.routes, (imgA, imgB) => {
    return combinedSimilarity(
      imgA.normalizedPoints,
      imgB.normalizedPoints,
      imgA.points,
      imgB.points,
      0.6,  // 使用稍大的 maxDistance
      weights
    );
  });
  printResults(`組合演算法 (MHD=${weights.mhd}, Order=${weights.order}, maxDist=0.6)`, intra, inter);
}

// 最終總結
console.log('\n\n' + '═'.repeat(70));
console.log('最終總結');
console.log('═'.repeat(70));

interface Summary {
  name: string;
  intraAvg: number;
  intraMin: number;
  interAvg: number;
  interMax: number;
  gap: number;
}

const summaries: Summary[] = [];

// 收集所有測試結果
const algorithms: { name: string; fn: (imgA: RouteImage, imgB: RouteImage) => number }[] = [
  {
    name: 'MHD (maxDist=0.5, 原始)',
    fn: (imgA, imgB) => distanceToSimilarity(
      modifiedHausdorffDistance(imgA.normalizedPoints, imgB.normalizedPoints), 0.5
    )
  },
  {
    name: 'MHD (maxDist=0.6)',
    fn: (imgA, imgB) => distanceToSimilarity(
      modifiedHausdorffDistance(imgA.normalizedPoints, imgB.normalizedPoints), 0.6
    )
  },
  {
    name: 'MHD (maxDist=0.7)',
    fn: (imgA, imgB) => distanceToSimilarity(
      modifiedHausdorffDistance(imgA.normalizedPoints, imgB.normalizedPoints), 0.7
    )
  },
  {
    name: '相對位置順序匹配',
    fn: (imgA, imgB) => relativeOrderSimilarity(imgA.points, imgB.points)
  },
  {
    name: '組合 (MHD=0.6, Order=0.4)',
    fn: (imgA, imgB) => combinedSimilarity(
      imgA.normalizedPoints, imgB.normalizedPoints,
      imgA.points, imgB.points, 0.6, { mhd: 0.6, order: 0.4 }
    )
  },
  {
    name: '組合 (MHD=0.5, Order=0.5)',
    fn: (imgA, imgB) => combinedSimilarity(
      imgA.normalizedPoints, imgB.normalizedPoints,
      imgA.points, imgB.points, 0.6, { mhd: 0.5, order: 0.5 }
    )
  },
];

for (const algo of algorithms) {
  const { intra, inter } = testAlgorithm(data.routes, algo.fn);
  const intraAvg = mean(intra.map(r => r.similarity));
  const intraMin = Math.min(...intra.map(r => r.similarity));
  const interAvg = mean(inter.map(r => r.similarity));
  const interMax = Math.max(...inter.map(r => r.similarity));

  summaries.push({
    name: algo.name,
    intraAvg,
    intraMin,
    interAvg,
    interMax,
    gap: intraAvg - interAvg
  });
}

console.log('\n| 演算法 | 同路線平均 | 同路線最低 | 跨路線平均 | 跨路線最高 | 區分差距 |');
console.log('|--------|-----------|-----------|-----------|-----------|---------|');
for (const s of summaries) {
  console.log(`| ${s.name.padEnd(25)} | ${s.intraAvg.toFixed(1).padStart(9)}% | ${String(s.intraMin).padStart(9)}% | ${s.interAvg.toFixed(1).padStart(9)}% | ${String(s.interMax).padStart(9)}% | ${s.gap.toFixed(1).padStart(7)}% |`);
}

// 找出最佳演算法
const bestByGap = summaries.reduce((a, b) => a.gap > b.gap ? a : b);
const bestByMinIntra = summaries.reduce((a, b) => a.intraMin > b.intraMin ? a : b);

console.log(`\n最佳區分能力: ${bestByGap.name} (差距 ${bestByGap.gap.toFixed(1)}%)`);
console.log(`最佳最低相似度: ${bestByMinIntra.name} (最低 ${bestByMinIntra.intraMin}%)`);
