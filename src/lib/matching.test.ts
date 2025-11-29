import { describe, it, expect } from 'vitest';
import {
  normalizePoints,
  modifiedHausdorffDistance,
  distanceToSimilarity,
  dtwDistance,
  relativeOrderSimilarity,
  combinedSimilarity,
  searchRoutes
} from './matching';
import type { Point, Route } from '../types/route';

describe('normalizePoints', () => {
  it('should return empty array for empty input', () => {
    expect(normalizePoints([])).toEqual([]);
  });

  it('should return origin for single point', () => {
    const result = normalizePoints([{ x: 5, y: 10 }]);
    expect(result).toEqual([{ x: 0, y: 0 }]);
  });

  it('should center points at origin', () => {
    const points: Point[] = [
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 1, y: 1 }
    ];
    const result = normalizePoints(points);

    // 重心應該在原點
    const centroidX = result.reduce((sum, p) => sum + p.x, 0) / result.length;
    const centroidY = result.reduce((sum, p) => sum + p.y, 0) / result.length;

    expect(centroidX).toBeCloseTo(0, 10);
    expect(centroidY).toBeCloseTo(0, 10);
  });

  it('should scale points to unit RMS', () => {
    const points: Point[] = [
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 2, y: 2 }
    ];
    const result = normalizePoints(points);

    // RMS 應該為 1
    const rms = Math.sqrt(
      result.reduce((sum, p) => sum + p.x * p.x + p.y * p.y, 0) / result.length
    );

    expect(rms).toBeCloseTo(1, 10);
  });

  it('should be translation invariant', () => {
    const points1: Point[] = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0.5, y: 1 }
    ];
    const points2: Point[] = [
      { x: 100, y: 200 },
      { x: 101, y: 200 },
      { x: 100.5, y: 201 }
    ];

    const norm1 = normalizePoints(points1);
    const norm2 = normalizePoints(points2);

    // 正規化後應該相同
    for (let i = 0; i < norm1.length; i++) {
      expect(norm1[i].x).toBeCloseTo(norm2[i].x, 10);
      expect(norm1[i].y).toBeCloseTo(norm2[i].y, 10);
    }
  });

  it('should be scale invariant', () => {
    const points1: Point[] = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0.5, y: 1 }
    ];
    const points2: Point[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 5, y: 10 }
    ];

    const norm1 = normalizePoints(points1);
    const norm2 = normalizePoints(points2);

    // 正規化後應該相同
    for (let i = 0; i < norm1.length; i++) {
      expect(norm1[i].x).toBeCloseTo(norm2[i].x, 10);
      expect(norm1[i].y).toBeCloseTo(norm2[i].y, 10);
    }
  });

  it('should handle coincident points', () => {
    const points: Point[] = [
      { x: 5, y: 5 },
      { x: 5, y: 5 },
      { x: 5, y: 5 }
    ];
    const result = normalizePoints(points);

    // 所有點都在原點
    for (const p of result) {
      expect(p.x).toBe(0);
      expect(p.y).toBe(0);
    }
  });
});

describe('modifiedHausdorffDistance', () => {
  it('should return Infinity for empty sets', () => {
    expect(modifiedHausdorffDistance([], [])).toBe(Infinity);
    expect(modifiedHausdorffDistance([{ x: 0, y: 0 }], [])).toBe(Infinity);
    expect(modifiedHausdorffDistance([], [{ x: 0, y: 0 }])).toBe(Infinity);
  });

  it('should return 0 for identical point sets', () => {
    const points: Point[] = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0.5, y: 1 }
    ];
    expect(modifiedHausdorffDistance(points, points)).toBe(0);
  });

  it('should be symmetric', () => {
    const A: Point[] = [
      { x: 0, y: 0 },
      { x: 1, y: 0 }
    ];
    const B: Point[] = [
      { x: 0.5, y: 0.5 },
      { x: 1.5, y: 0.5 }
    ];

    const dAB = modifiedHausdorffDistance(A, B);
    const dBA = modifiedHausdorffDistance(B, A);

    expect(dAB).toBeCloseTo(dBA, 10);
  });

  it('should increase with larger differences', () => {
    const A: Point[] = [{ x: 0, y: 0 }];
    const B1: Point[] = [{ x: 0.1, y: 0 }];
    const B2: Point[] = [{ x: 0.5, y: 0 }];

    const d1 = modifiedHausdorffDistance(A, B1);
    const d2 = modifiedHausdorffDistance(A, B2);

    expect(d2).toBeGreaterThan(d1);
  });

  it('should be robust to extra points', () => {
    // MHD 應該對多餘的點有一定容忍度
    const base: Point[] = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0.5, y: 1 }
    ];
    const withExtra: Point[] = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0.5, y: 1 },
      { x: 0.5, y: 0.5 } // 多一個點
    ];

    const dist = modifiedHausdorffDistance(base, withExtra);

    // 距離應該相對小，因為原本的點都還在
    expect(dist).toBeLessThan(0.5);
  });
});

describe('distanceToSimilarity', () => {
  it('should return 100 for distance 0', () => {
    expect(distanceToSimilarity(0)).toBe(100);
  });

  it('should return 0 for distance >= maxDistance', () => {
    // 預設 maxDistance 現在是 0.6
    expect(distanceToSimilarity(0.6)).toBe(0);
    expect(distanceToSimilarity(1.0)).toBe(0);
    expect(distanceToSimilarity(10)).toBe(0);
  });

  it('should return 50 for distance = maxDistance/2', () => {
    expect(distanceToSimilarity(0.3, 0.6)).toBe(50);
    expect(distanceToSimilarity(0.25, 0.5)).toBe(50);
  });

  it('should use custom maxDistance', () => {
    expect(distanceToSimilarity(0.5, 1.0)).toBe(50);
    expect(distanceToSimilarity(0.25, 1.0)).toBe(75);
  });

  it('should round to integer', () => {
    const result = distanceToSimilarity(0.123, 0.6);
    expect(Number.isInteger(result)).toBe(true);
  });
});

describe('dtwDistance', () => {
  it('should return Infinity for empty sequences', () => {
    expect(dtwDistance([], [])).toBe(Infinity);
    expect(dtwDistance([1, 2, 3], [])).toBe(Infinity);
    expect(dtwDistance([], [1, 2, 3])).toBe(Infinity);
  });

  it('should return 0 for identical sequences', () => {
    expect(dtwDistance([1, 2, 3], [1, 2, 3])).toBe(0);
    expect(dtwDistance([0.5], [0.5])).toBe(0);
  });

  it('should handle sequences of different lengths', () => {
    // DTW 應該能處理不同長度的序列
    const dist = dtwDistance([0, 1], [0, 0.5, 1]);
    expect(dist).toBeLessThan(1);
    expect(dist).toBeGreaterThan(0);
  });

  it('should increase with larger differences', () => {
    const d1 = dtwDistance([0, 1], [0.1, 1.1]);
    const d2 = dtwDistance([0, 1], [0.5, 1.5]);
    expect(d2).toBeGreaterThan(d1);
  });

  it('should be symmetric', () => {
    const seqA = [0, 0.3, 0.7, 1];
    const seqB = [0.1, 0.5, 0.9];
    expect(dtwDistance(seqA, seqB)).toBeCloseTo(dtwDistance(seqB, seqA), 10);
  });
});

describe('relativeOrderSimilarity', () => {
  it('should return 0 for empty point sets', () => {
    expect(relativeOrderSimilarity([], [])).toBe(0);
    expect(relativeOrderSimilarity([{ x: 0, y: 0 }], [])).toBe(0);
  });

  it('should return 100 for single identical points', () => {
    expect(relativeOrderSimilarity(
      [{ x: 0.5, y: 0.5 }],
      [{ x: 0.5, y: 0.5 }]
    )).toBe(100);
  });

  it('should return 100 for identical point sets', () => {
    const points: Point[] = [
      { x: 0.2, y: 0.1 },
      { x: 0.5, y: 0.3 },
      { x: 0.8, y: 0.6 }
    ];
    expect(relativeOrderSimilarity(points, points)).toBe(100);
  });

  it('should be tolerant to uniform scaling', () => {
    const pointsA: Point[] = [
      { x: 0.2, y: 0.1 },
      { x: 0.5, y: 0.3 },
      { x: 0.8, y: 0.6 }
    ];
    // 縮放後的點（相對順序相同）
    const pointsB: Point[] = [
      { x: 0.1, y: 0.05 },
      { x: 0.25, y: 0.15 },
      { x: 0.4, y: 0.3 }
    ];
    // 應該仍有高相似度
    expect(relativeOrderSimilarity(pointsA, pointsB)).toBeGreaterThan(80);
  });

  it('should detect different orderings', () => {
    const pointsA: Point[] = [
      { x: 0.2, y: 0.1 },  // 最上面，偏左
      { x: 0.8, y: 0.5 },  // 中間，偏右
      { x: 0.3, y: 0.9 }   // 最下面，偏左
    ];
    const pointsB: Point[] = [
      { x: 0.8, y: 0.1 },  // 最上面，偏右（不同）
      { x: 0.2, y: 0.5 },  // 中間，偏左（不同）
      { x: 0.7, y: 0.9 }   // 最下面，偏右（不同）
    ];
    // 順序不同，相似度應該較低
    expect(relativeOrderSimilarity(pointsA, pointsB)).toBeLessThan(50);
  });
});

describe('combinedSimilarity', () => {
  it('should combine MHD and order similarity with default weights', () => {
    // 預設權重 MHD=0.6, Order=0.4
    expect(combinedSimilarity(100, 100)).toBe(100);
    expect(combinedSimilarity(0, 0)).toBe(0);
    expect(combinedSimilarity(100, 0)).toBe(60);  // 100*0.6 + 0*0.4
    expect(combinedSimilarity(0, 100)).toBe(40);  // 0*0.6 + 100*0.4
  });

  it('should use custom weights', () => {
    expect(combinedSimilarity(100, 0, { mhd: 0.7, order: 0.3 })).toBe(70);
    expect(combinedSimilarity(0, 100, { mhd: 0.7, order: 0.3 })).toBe(30);
    expect(combinedSimilarity(50, 50, { mhd: 0.5, order: 0.5 })).toBe(50);
  });

  it('should round to integer', () => {
    const result = combinedSimilarity(33, 67);
    expect(Number.isInteger(result)).toBe(true);
  });
});

describe('searchRoutes', () => {
  const createRoute = (id: string, name: string, points: Point[]): Route => ({
    id,
    name,
    images: [
      {
        id: `img-${id}`,
        filename: `images/${id}.jpg`,
        points,
        normalizedPoints: normalizePoints(points)
      }
    ],
    createdAt: new Date().toISOString()
  });

  it('should return empty array for empty routes', () => {
    const query: Point[] = [{ x: 0.5, y: 0.5 }];
    const results = searchRoutes(query, []);
    expect(results).toEqual([]);
  });

  it('should return routes sorted by similarity', () => {
    const trianglePoints: Point[] = [
      { x: 0.2, y: 0.2 },
      { x: 0.8, y: 0.2 },
      { x: 0.5, y: 0.8 }
    ];
    const squarePoints: Point[] = [
      { x: 0.2, y: 0.2 },
      { x: 0.8, y: 0.2 },
      { x: 0.8, y: 0.8 },
      { x: 0.2, y: 0.8 }
    ];

    const routes = [
      createRoute('1', '三角形', trianglePoints),
      createRoute('2', '正方形', squarePoints)
    ];

    // 搜尋三角形
    const results = searchRoutes(trianglePoints, routes);

    expect(results.length).toBe(2);
    expect(results[0].route.name).toBe('三角形');
    expect(results[0].similarity).toBe(100);
    expect(results[1].route.name).toBe('正方形');
  });

  it('should limit results to maxResults', () => {
    const routes = Array.from({ length: 20 }, (_, i) =>
      createRoute(`${i}`, `路線 ${i}`, [{ x: 0.1 * i, y: 0.1 * i }])
    );

    const results = searchRoutes([{ x: 0.5, y: 0.5 }], routes, 5);
    expect(results.length).toBe(5);
  });

  it('should find best match among multiple images', () => {
    const routeWithMultipleImages: Route = {
      id: 'multi',
      name: '多圖片路線',
      images: [
        {
          id: 'img1',
          filename: 'images/1.jpg',
          points: [{ x: 0.1, y: 0.1 }],
          normalizedPoints: normalizePoints([{ x: 0.1, y: 0.1 }])
        },
        {
          id: 'img2',
          filename: 'images/2.jpg',
          points: [{ x: 0.5, y: 0.5 }, { x: 0.6, y: 0.6 }],
          normalizedPoints: normalizePoints([{ x: 0.5, y: 0.5 }, { x: 0.6, y: 0.6 }])
        }
      ],
      createdAt: new Date().toISOString()
    };

    // 搜尋與第二張圖片相似的點
    const query: Point[] = [{ x: 0.5, y: 0.5 }, { x: 0.6, y: 0.6 }];
    const results = searchRoutes(query, [routeWithMultipleImages]);

    expect(results.length).toBe(1);
    expect(results[0].matchedImageId).toBe('img2');
    expect(results[0].similarity).toBe(100);
  });

  it('should handle missing points (tolerance test)', () => {
    // 建立一條有 5 個點的路線
    const fullPoints: Point[] = [
      { x: 0.2, y: 0.2 },
      { x: 0.4, y: 0.3 },
      { x: 0.6, y: 0.2 },
      { x: 0.3, y: 0.6 },
      { x: 0.5, y: 0.7 }
    ];

    const route = createRoute('full', '完整路線', fullPoints);

    // 只標記其中 4 個點（漏標 1 個）
    const partialPoints: Point[] = [
      { x: 0.2, y: 0.2 },
      { x: 0.4, y: 0.3 },
      { x: 0.6, y: 0.2 },
      { x: 0.5, y: 0.7 }
    ];

    const results = searchRoutes(partialPoints, [route]);

    // 相似度應該 > 0（能找到路線）
    // 注意：由於正規化會改變形狀，漏標點會影響相似度
    // 實際應用中可透過調整 maxDistance 來改善
    expect(results[0].similarity).toBeGreaterThan(0);
  });

  it('should rank correct route higher even with missing points', () => {
    // 目標路線
    const targetPoints: Point[] = [
      { x: 0.2, y: 0.2 },
      { x: 0.4, y: 0.3 },
      { x: 0.6, y: 0.2 },
      { x: 0.3, y: 0.6 },
      { x: 0.5, y: 0.7 }
    ];

    // 完全不同的路線
    const differentPoints: Point[] = [
      { x: 0.9, y: 0.1 },
      { x: 0.1, y: 0.9 },
      { x: 0.5, y: 0.5 }
    ];

    const routes = [
      createRoute('target', '目標路線', targetPoints),
      createRoute('different', '不同路線', differentPoints)
    ];

    // 搜尋部分匹配的點（漏標 1-2 個）
    const partialPoints: Point[] = [
      { x: 0.2, y: 0.2 },
      { x: 0.6, y: 0.2 },
      { x: 0.5, y: 0.7 }
    ];

    const results = searchRoutes(partialPoints, routes);

    // 目標路線應該排名高於完全不同的路線
    expect(results[0].route.name).toBe('目標路線');
  });
});
