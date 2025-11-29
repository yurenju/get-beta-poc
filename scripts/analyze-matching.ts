/**
 * 分析腳本：測試不同角度照片的匹配效果
 */

import * as fs from 'fs';
import * as path from 'path';

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

// === 演算法函數 (複製自 matching.ts) ===

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

function distanceToSimilarity(distance: number, maxDistance: number = 0.5): number {
  if (distance >= maxDistance) return 0;
  const similarity = Math.max(0, 1 - distance / maxDistance);
  return Math.round(similarity * 100);
}

// === 分析函數 ===

function analyzeRoute(route: Route): void {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`路線: ${route.name}`);
  console.log(`圖片數量: ${route.images.length}`);
  console.log('='.repeat(60));

  if (route.images.length < 2) {
    console.log('只有一張圖片，無法進行角度比對分析');
    return;
  }

  // 計算同一路線不同圖片之間的相似度
  for (let i = 0; i < route.images.length; i++) {
    for (let j = i + 1; j < route.images.length; j++) {
      const imgA = route.images[i];
      const imgB = route.images[j];

      const mhd = modifiedHausdorffDistance(
        imgA.normalizedPoints,
        imgB.normalizedPoints
      );
      const similarity = distanceToSimilarity(mhd);

      console.log(`\n比對: 圖片 ${i + 1} vs 圖片 ${j + 1}`);
      console.log(`  - 圖片 A: ${imgA.filename.substring(0, 8)}... (${imgA.points.length} 點)`);
      console.log(`  - 圖片 B: ${imgB.filename.substring(0, 8)}... (${imgB.points.length} 點)`);
      console.log(`  - MHD 距離: ${mhd.toFixed(4)}`);
      console.log(`  - 相似度: ${similarity}%`);

      // 分析點的分布
      analyzePointDistribution(imgA, imgB);
    }
  }
}

function analyzePointDistribution(imgA: RouteImage, imgB: RouteImage): void {
  // 計算原始點的 bounding box
  const getBoundingBox = (points: Point[]) => {
    const xs = points.map(p => p.x);
    const ys = points.map(p => p.y);
    return {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys),
      width: Math.max(...xs) - Math.min(...xs),
      height: Math.max(...ys) - Math.min(...ys)
    };
  };

  const bbA = getBoundingBox(imgA.points);
  const bbB = getBoundingBox(imgB.points);

  console.log(`  - 圖片 A 範圍: W=${bbA.width.toFixed(3)}, H=${bbA.height.toFixed(3)}, 比例=${(bbA.width / bbA.height).toFixed(3)}`);
  console.log(`  - 圖片 B 範圍: W=${bbB.width.toFixed(3)}, H=${bbB.height.toFixed(3)}, 比例=${(bbB.width / bbB.height).toFixed(3)}`);

  // 計算寬高比差異
  const aspectRatioA = bbA.width / bbA.height;
  const aspectRatioB = bbB.width / bbB.height;
  const aspectRatioDiff = Math.abs(aspectRatioA - aspectRatioB) / Math.max(aspectRatioA, aspectRatioB) * 100;

  console.log(`  - 寬高比差異: ${aspectRatioDiff.toFixed(1)}%`);
}

function crossRouteAnalysis(routes: Route[]): void {
  console.log(`\n${'#'.repeat(60)}`);
  console.log('跨路線匹配分析（應該要低相似度）');
  console.log('#'.repeat(60));

  // 對每條路線的第一張圖，與其他路線比對
  const results: { routeA: string; routeB: string; similarity: number }[] = [];

  for (let i = 0; i < routes.length; i++) {
    for (let j = i + 1; j < routes.length; j++) {
      const routeA = routes[i];
      const routeB = routes[j];

      if (routeA.images.length === 0 || routeB.images.length === 0) continue;

      // 取各路線最佳匹配
      let bestSimilarity = 0;
      for (const imgA of routeA.images) {
        for (const imgB of routeB.images) {
          const mhd = modifiedHausdorffDistance(imgA.normalizedPoints, imgB.normalizedPoints);
          const similarity = distanceToSimilarity(mhd);
          if (similarity > bestSimilarity) {
            bestSimilarity = similarity;
          }
        }
      }

      results.push({
        routeA: routeA.name,
        routeB: routeB.name,
        similarity: bestSimilarity
      });
    }
  }

  // 排序並顯示
  results.sort((a, b) => b.similarity - a.similarity);

  console.log('\n跨路線相似度（由高到低，前 10 個）:');
  results.slice(0, 10).forEach((r, idx) => {
    const warning = r.similarity > 50 ? ' ⚠️ 過高！' : '';
    console.log(`${idx + 1}. ${r.routeA} vs ${r.routeB}: ${r.similarity}%${warning}`);
  });
}

function summarize(routes: Route[]): void {
  console.log(`\n${'#'.repeat(60)}`);
  console.log('總結統計');
  console.log('#'.repeat(60));

  const intraRouteSimilarities: number[] = [];
  const interRouteSimilarities: number[] = [];

  // 同路線相似度
  for (const route of routes) {
    if (route.images.length < 2) continue;
    for (let i = 0; i < route.images.length; i++) {
      for (let j = i + 1; j < route.images.length; j++) {
        const mhd = modifiedHausdorffDistance(
          route.images[i].normalizedPoints,
          route.images[j].normalizedPoints
        );
        intraRouteSimilarities.push(distanceToSimilarity(mhd));
      }
    }
  }

  // 跨路線相似度
  for (let i = 0; i < routes.length; i++) {
    for (let j = i + 1; j < routes.length; j++) {
      if (routes[i].images.length === 0 || routes[j].images.length === 0) continue;
      const mhd = modifiedHausdorffDistance(
        routes[i].images[0].normalizedPoints,
        routes[j].images[0].normalizedPoints
      );
      interRouteSimilarities.push(distanceToSimilarity(mhd));
    }
  }

  console.log('\n同路線（不同角度）相似度統計:');
  console.log(`  - 樣本數: ${intraRouteSimilarities.length}`);
  console.log(`  - 平均: ${mean(intraRouteSimilarities).toFixed(1)}%`);
  console.log(`  - 最低: ${Math.min(...intraRouteSimilarities)}%`);
  console.log(`  - 最高: ${Math.max(...intraRouteSimilarities)}%`);
  console.log(`  - 分布: ${intraRouteSimilarities.join('%, ')}%`);

  console.log('\n跨路線相似度統計（第一張圖互比）:');
  console.log(`  - 樣本數: ${interRouteSimilarities.length}`);
  console.log(`  - 平均: ${mean(interRouteSimilarities).toFixed(1)}%`);
  console.log(`  - 最低: ${Math.min(...interRouteSimilarities)}%`);
  console.log(`  - 最高: ${Math.max(...interRouteSimilarities)}%`);

  // 計算區分能力
  const gap = mean(intraRouteSimilarities) - mean(interRouteSimilarities);
  console.log(`\n區分能力分析:`);
  console.log(`  - 同路線平均 vs 跨路線平均 差距: ${gap.toFixed(1)}%`);
  console.log(`  - 判斷: ${gap > 30 ? '✅ 區分能力良好' : gap > 15 ? '⚠️ 區分能力一般' : '❌ 區分能力不足'}`);
}

// === 主程式 ===

import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataPath = path.join(__dirname, '../docs/research/route-dataset-2025-11-29 (1)/routes.json');
const data: RouteData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

console.log('路線匹配演算法分析');
console.log(`載入 ${data.routes.length} 條路線`);

// 分析每條路線內部的匹配情況
for (const route of data.routes) {
  analyzeRoute(route);
}

// 跨路線分析
crossRouteAnalysis(data.routes);

// 總結
summarize(data.routes);
