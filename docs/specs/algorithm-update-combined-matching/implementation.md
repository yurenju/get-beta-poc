# 實作計畫：組合演算法更新

## 研究文件參考

**研究文件路徑：** `docs/research/2025-11-29-angle-invariant-matching.md`

## 任務概要

- [x] 實作 DTW 順序感知匹配演算法
- [x] 實作組合演算法並整合到 searchRoutes
- [x] 更新 maxDistance 預設值
- [x] 執行驗收測試
- [x] 更新專案文件

## 任務細節

### 實作 DTW 順序感知匹配演算法

**實作要點**
- 在 `src/lib/matching.ts` 新增 `dtwDistance` 函數，實作 Dynamic Time Warping 演算法
- 新增 `relativeOrderSimilarity` 函數：
  - 將點按 Y 座標排序
  - 提取 X 座標序列並正規化到 0-1 範圍
  - 使用 DTW 計算序列距離
  - 將距離轉換為 0-100% 相似度
- 新增對應的單元測試

**相關檔案**
- `src/lib/matching.ts` - 新增 DTW 和順序匹配函數
- `src/lib/matching.test.ts` - 新增對應測試

**完成檢查**
- 執行 `npm test` 確認新增的 DTW 和順序匹配測試通過

**實作備註**
照預期開發

---

### 實作組合演算法並整合到 searchRoutes

**實作要點**
- 新增 `combinedSimilarity` 函數：
  - 接收 MHD 相似度和順序相似度
  - 使用權重配置（預設 MHD=0.6, Order=0.4）計算加權平均
  - 回傳 0-100 整數相似度
- 新增 `MatchingOptions` 介面，包含：
  - `maxDistance`: 預設 0.6
  - `mhdWeight`: 預設 0.6
  - `orderWeight`: 預設 0.4
- 修改 `searchRoutes` 函數：
  - 新增可選的 `options` 參數
  - 對每張圖片同時計算 MHD 和順序相似度
  - 使用 `combinedSimilarity` 計算最終分數
- 保持向後相容：不傳 options 時使用新的預設值
- 新增組合演算法的整合測試

**相關檔案**
- `src/lib/matching.ts` - 修改 searchRoutes，新增組合演算法
- `src/lib/matching.test.ts` - 新增組合演算法測試

**完成檢查**
- 執行 `npm test` 確認所有測試通過（包含新增的組合演算法測試）
- 確認現有測試沒有因為預設值變更而失敗（可能需要調整預期值）

**實作備註**
照預期開發

---

### 更新 maxDistance 預設值

**實作要點**
- 將 `distanceToSimilarity` 的預設 `maxDistance` 從 0.5 改為 0.6
- 檢查並更新所有相關測試的預期值
- 確保 `searchRoutes` 使用新的預設值

**相關檔案**
- `src/lib/matching.ts` - 修改預設值
- `src/lib/matching.test.ts` - 更新測試預期值

**完成檢查**
- 執行 `npm test` 確認所有測試通過

**實作備註**
照預期開發

---

### 執行驗收測試

**實作要點**
- 使用測試腳本 `scripts/test-algorithms.ts` 驗證演算法效果
- 確認組合演算法達到研究報告中的預期效果：
  - 同路線最低相似度 > 50%（原始 29% → 目標 57%）
  - 區分差距 > 30%（目標 36%）
- 如發現問題，記錄詳細的錯誤資訊

**相關檔案**
- `acceptance.feature` - Gherkin 格式的驗收測試場景
- `scripts/test-algorithms.ts` - 演算法測試腳本

**實作備註**
由使用者自行驗收通過

---

### 更新專案文件

**實作要點**
- 審查 CLAUDE.md，更新演算法說明：
  - 新增組合演算法的描述
  - 更新資料流程圖
  - 記錄新的預設參數
- 審查 README.md，如有需要更新功能說明

**相關檔案**
- `CLAUDE.md` - AI 助手的專案指引文件
- `README.md` - 專案主要說明文件

**實作備註**
照預期開發

---

## 實作參考資訊

### 來自研究文件的技術洞察
> **文件路徑：** `docs/research/2025-11-29-angle-invariant-matching.md`

**DTW 順序匹配實作要點：**
```typescript
function dtwDistance(seqA: number[], seqB: number[]): number {
  const n = seqA.length;
  const m = seqB.length;
  if (n === 0 || m === 0) return Infinity;

  const dtw: number[][] = Array(n + 1).fill(null)
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
  return dtw[n][m] / Math.max(n, m);
}
```

**相對位置順序匹配：**
```typescript
function relativeOrderSimilarity(pointsA: Point[], pointsB: Point[]): number {
  // 1. 按 Y 座標排序
  const sortedA = [...pointsA].sort((a, b) => a.y - b.y);
  const sortedB = [...pointsB].sort((a, b) => a.y - b.y);

  // 2. 提取 X 座標
  const xSeqA = sortedA.map(p => p.x);
  const xSeqB = sortedB.map(p => p.x);

  // 3. 正規化到 0-1
  const normalize = (seq: number[]) => {
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
```

**組合演算法：**
```typescript
function combinedSimilarity(
  mhdSimilarity: number,
  orderSimilarity: number,
  weights = { mhd: 0.6, order: 0.4 }
): number {
  return Math.round(
    weights.mhd * mhdSimilarity +
    weights.order * orderSimilarity
  );
}
```

### 關鍵技術決策

| 參數 | 值 | 理由 |
|-----|-----|------|
| maxDistance | 0.6 | 平衡同路線相似度提升與區分能力 |
| MHD 權重 | 0.6 | 保留 MHD 的區分能力 |
| Order 權重 | 0.4 | 補償透視變形造成的形變 |

**預期效果（根據研究報告）：**
- 同路線最低相似度：29% → 57%（+96%）
- 區分差距：53.5% → 36.0%（仍然良好）
