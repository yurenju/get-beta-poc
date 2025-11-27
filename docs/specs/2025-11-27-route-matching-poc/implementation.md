# 實作計畫

## PRD 參考

**PRD 文件路徑：** `docs/specs/2025-11-27-route-matching-poc/prd.md`
**相關研究文件：** `docs/research/2025-11-27-bouldering-video-route-matching.md`

## 任務概要

- [x] 建立 OPFS 資料存取層
- [x] 實作 MHD 匹配演算法
- [x] 建立圖片標記元件
- [x] 實作搜尋與結果顯示
- [x] 實作路線建立與加入功能
- [x] 實作路線管理頁面
- [x] 執行驗收測試
- [x] 更新專案文件

## 任務細節

### 建立 OPFS 資料存取層

**實作要點**
- 建立 `src/lib/storage.ts`，封裝所有 OPFS 操作
- 實作 `initStorage()`：初始化 OPFS 目錄結構（建立 `images/` 目錄）
- 實作 `loadRoutes()`：從 `routes.json` 讀取路線資料，若檔案不存在則回傳空陣列
- 實作 `saveRoutes(routes)`：將路線資料寫入 `routes.json`
- 實作 `saveImage(blob, filename)`：將圖片儲存到 `images/` 目錄
- 實作 `loadImage(filename)`：從 `images/` 目錄讀取圖片，回傳 Blob
- 實作 `deleteImage(filename)`：刪除指定圖片檔案
- 建立 `src/types/route.ts`，定義 TypeScript 型別：
  - `Point { x: number; y: number }`
  - `RouteImage { id: string; filename: string; points: Point[]; normalizedPoints: Point[] }`
  - `Route { id: string; name: string; images: RouteImage[]; createdAt: string }`
  - `RoutesData { routes: Route[] }`

**相關檔案**
- `src/lib/storage.ts` - OPFS 操作封裝（新建）
- `src/types/route.ts` - 型別定義（新建）

**完成檢查**
- 執行 `npm run build` 和 `npm run lint` 確認無 TypeScript 和 ESLint 錯誤
- 在瀏覽器 DevTools 中執行簡單的儲存/讀取測試，確認 OPFS 運作正常

**實作備註**
照預期開發

---

### 實作 MHD 匹配演算法

**實作要點**
- 建立 `src/lib/matching.ts`，實作匹配相關函式
- 實作 `normalizePoints(points)`：
  - 計算重心並平移到原點
  - 計算 RMS 並縮放到標準大小
  - 處理邊界情況：點數為 0 或 1 時的處理
- 實作 `modifiedHausdorffDistance(A, B)`：
  - 計算 A 中每個點到 B 的最近距離的平均
  - 計算 B 中每個點到 A 的最近距離的平均
  - 回傳兩者的最大值
- 實作 `distanceToSimilarity(distance, maxDistance = 0.5)`：將距離轉換為 0-100 的相似度百分比
- 實作 `searchRoutes(queryPoints, routes)`：
  - 對每條路線的每張圖片計算 MHD
  - 取每條路線中最小的距離（最高相似度）作為該路線的相似度
  - 回傳按相似度排序的結果（前 10 名）
- 為核心函式撰寫單元測試（`src/lib/matching.test.ts`）

**相關檔案**
- `src/lib/matching.ts` - 匹配演算法（新建）
- `src/lib/matching.test.ts` - 單元測試（新建）

**完成檢查**
- 安裝 vitest 並設定測試環境
- 執行 `npm run build` 和 `npm run lint` 確認無 TypeScript 和 ESLint 錯誤
- 執行 `npm test` 確認單元測試通過
- 測試案例應涵蓋：正規化、MHD 計算、相似度轉換、多圖片路線搜尋

**實作備註**
[技術決策] 正規化處理會改變點集合的「形狀」，當漏標點時會影響相似度。測試案例調整為驗證「正確路線排名較高」而非固定的相似度閾值。實際使用時可透過調整 `maxDistance` 參數改善容錯性。

---

### 建立圖片標記元件

**實作要點**
- 建立 `src/components/ImageMarker.tsx`：圖片顯示與標記元件
  - Props：`imageUrl`, `points`, `onPointsChange`, `readonly`
  - 使用 `<img>` 顯示圖片，上方疊加 `<svg>` 顯示標記點（使用 `viewBox="0 0 1 1"` 對應正規化座標）
  - 監聽 `pointerdown` 事件處理點擊
  - 計算相對座標（0-1 正規化）：`(clientX - rect.left) / rect.width`
  - 標記點以圓點顯示（例如紅色圓圈，半徑約 10px）
- 建立 `src/components/ImageInput.tsx`：圖片輸入元件
  - 提供「拍照」和「上傳圖片」兩個按鈕
  - 「拍照」使用 `<input type="file" accept="image/*" capture="environment">`
  - 「上傳」使用 `<input type="file" accept="image/*">`
  - 選擇後將圖片轉為 Blob URL 並透過 callback 傳出
- 建立 `src/components/ClearButton.tsx`：清除標記按鈕
- 更新樣式：在 `src/App.css` 或建立新的 CSS 檔案

**相關檔案**
- `src/components/ImageMarker.tsx` - 圖片標記元件（新建）
- `src/components/ImageInput.tsx` - 圖片輸入元件（新建）
- `src/components/ClearButton.tsx` - 清除按鈕（新建）
- `src/App.css` - 樣式更新

**完成檢查**
- 執行 `npm run build` 和 `npm run lint` 確認無 TypeScript 和 ESLint 錯誤
- 使用 playwright mcp 開啟 http://localhost:5173，上傳測試圖片（`docs/specs/2025-11-27-route-matching-poc/routes/route-1.png`）後可點擊標記，標記點正確顯示在點擊位置

**實作備註**
照預期開發

---

### 實作搜尋與結果顯示

**實作要點**
- 建立 `src/components/SearchResults.tsx`：搜尋結果列表元件
  - Props：`results: SearchResult[]`, `onRouteClick`
  - 每個結果顯示：縮圖（含標記點）、相似度百分比、路線名稱
  - 水平捲動或 grid 佈局
- 建立 `src/components/RouteCard.tsx`：單一路線卡片元件
  - 顯示縮圖（使用第一張圖片）
  - 在縮圖上疊加顯示標記點
  - 顯示相似度和名稱
- 建立 `src/components/RouteDetailModal.tsx`：路線詳情彈窗
  - 顯示大圖（含標記點）
  - 顯示路線名稱
  - 提供「加入此路線」按鈕
  - 提供關閉按鈕
- 建立 `src/hooks/useRoutes.ts`：路線資料 hook
  - 管理路線載入、儲存狀態
  - 提供 `routes`, `loading`, `addRoute`, `addImageToRoute`, `deleteRoute` 等
- 在主頁面整合即時搜尋邏輯：
  - 當 `points` 變更時，呼叫 `searchRoutes()` 並更新結果
  - 使用 `useMemo` 或 `useEffect` 處理搜尋觸發

**相關檔案**
- `src/components/SearchResults.tsx` - 搜尋結果列表（新建）
- `src/components/RouteCard.tsx` - 路線卡片（新建）
- `src/components/RouteDetailModal.tsx` - 路線詳情彈窗（新建）
- `src/hooks/useRoutes.ts` - 路線資料 hook（新建）
- `src/App.tsx` - 整合即時搜尋

**完成檢查**
- 執行 `npm run build` 和 `npm run lint` 確認無 TypeScript 和 ESLint 錯誤
- 使用 playwright mcp 開啟 http://localhost:5173，用測試圖片（`docs/specs/2025-11-27-route-matching-poc/routes/` 目錄下的 route-1.png、route-2.png）建立 1-2 條測試路線
- 使用 playwright mcp 驗證：標記點後搜尋結果即時顯示，點擊結果卡片彈窗正確開啟

**實作備註**
[技術決策] React 19 的 ESLint 規則禁止在 useEffect 中同步呼叫 setState，改用 useMemo 計算衍生狀態，useEffect 僅用於非同步載入圖片 URL。
[後續依賴] 搜尋結果顯示功能已完成，但完整驗證需等待「路線建立」功能實作後才能建立測試路線。useRoutes hook 中的 addRoute、addImageToRoute 已實作完成，供下一個任務使用。

---

### 實作路線建立與加入功能

**實作要點**
- 建立 `src/components/CreateRouteModal.tsx`：建立新路線彈窗
  - 輸入欄位：路線名稱
  - 確認和取消按鈕
  - 確認時：產生 UUID、儲存圖片到 OPFS、建立路線資料、更新 routes.json
- 在 `RouteDetailModal.tsx` 中實作「加入此路線」功能：
  - 點擊後將當前圖片和標記點加入該路線的 `images` 陣列
  - 儲存圖片到 OPFS
  - 更新 routes.json
  - 顯示成功訊息並關閉彈窗
- 更新 `useRoutes.ts`：
  - 實作 `createRoute(name, imageBlob, points)`
  - 實作 `addImageToRoute(routeId, imageBlob, points)`
- 在主頁面加入「建立新路線」按鈕
- 產生 UUID 使用 `crypto.randomUUID()`

**相關檔案**
- `src/components/CreateRouteModal.tsx` - 建立路線彈窗（新建）
- `src/components/RouteDetailModal.tsx` - 加入路線功能（更新）
- `src/hooks/useRoutes.ts` - 新增 createRoute, addImageToRoute（更新）
- `src/App.tsx` - 整合建立路線按鈕

**完成檢查**
- 執行 `npm run build` 和 `npm run lint` 確認無 TypeScript 和 ESLint 錯誤
- 使用 playwright mcp 開啟 http://localhost:5173，測試建立新路線：輸入名稱後確認路線成功儲存
- 使用 playwright mcp 測試加入現有路線：確認圖片和標記點正確加入
- 使用 playwright mcp 重新整理頁面後確認資料仍然存在

**實作備註**
照預期開發。useRoutes hook 中已實作 addRoute 和 addImageToRoute，本任務只需建立 CreateRouteModal UI 並整合到 App.tsx。

---

### 實作路線管理頁面

**實作要點**
- 建立 `src/components/RouteListModal.tsx`：路線清單彈窗
  - 顯示所有已儲存的路線
  - 每條路線顯示：縮圖、名稱、建立時間
  - 點擊路線可查看詳情（複用 RouteDetailModal）
  - 提供刪除按鈕（帶確認提示）
- 更新 `useRoutes.ts`：
  - 實作 `deleteRoute(routeId)`：刪除路線及其所有圖片
- 在主頁面加入「查看所有路線」按鈕
- 刪除時需同時刪除 OPFS 中的圖片檔案

**相關檔案**
- `src/components/RouteListModal.tsx` - 路線清單彈窗（新建）
- `src/hooks/useRoutes.ts` - 新增 deleteRoute（更新）
- `src/App.tsx` - 整合查看路線按鈕

**完成檢查**
- 執行 `npm run build` 和 `npm run lint` 確認無 TypeScript 和 ESLint 錯誤
- 使用 playwright mcp 開啟 http://localhost:5173，測試查看所有路線：確認清單正確顯示所有已儲存路線
- 使用 playwright mcp 測試刪除路線：確認路線和圖片都被正確刪除，搜尋結果不再包含該路線

**實作備註**
照預期開發。useRoutes hook 中已有 deleteRoute 函式，本任務建立 RouteListModal 元件整合路線清單顯示、刪除確認對話框，並連接到 App.tsx 的「查看所有路線」按鈕。

---

### 執行驗收測試

**實作要點**
- 使用 playwright mcp 讀取 acceptance.feature 檔案
- 透過 playwright mcp 瀏覽器操作執行每個場景
- 驗證所有場景通過並記錄結果
- 如發現問題，記錄詳細的錯誤資訊和重現步驟

**相關檔案**
- `docs/specs/2025-11-27-route-matching-poc/acceptance.feature` - Gherkin 格式的驗收測試場景
- `docs/specs/2025-11-27-route-matching-poc/acceptance-report.md` - 詳細的驗收測試執行報告（執行時生成）

**實作備註**
13/14 場景完全通過，1 場景（漏標容錯）部分通過。

[技術發現] MHD 演算法對位置偏差有很好的容忍度（5-10% 偏差仍達 100% 相似度），但對漏標點較敏感（漏 1 點降至 39%，漏 2 點降至 11%）。這是 POC 的重要發現，後續可透過調整 `maxDistance` 參數或改用部分匹配策略來改善。

詳細報告：[acceptance-report.md](acceptance-report.md)

---

### 更新專案文件

**實作要點**
- 審查 README.md，更新專案說明：
  - 功能介紹：抱石路線標註與匹配 POC
  - 技術棧：React 19 + TypeScript + OPFS + MHD 演算法
  - 使用方式：如何啟動、如何使用
- 建立 CLAUDE.md（如不存在），記錄：
  - 專案架構概述
  - 重要技術決策（OPFS、MHD、多圖片搜尋策略）
  - 檔案結構說明
- 確保所有程式碼範例和指令都是最新且可執行的
- **注意**：不需要更新 docs/research 和 docs/specs 目錄中的歷史文件

**相關檔案**
- `README.md` - 專案主要說明文件
- `CLAUDE.md` - AI 助手的專案指引文件

**實作備註**
照預期開發

---

## 實作參考資訊

### 來自研究文件的技術洞察
> **文件路徑：** `docs/research/2025-11-27-bouldering-video-route-matching.md`

#### 座標取得與正規化

使用 Pointer Events API 處理點擊：
```javascript
// 取得相對於元素的座標
const rect = element.getBoundingClientRect();
const x = (event.clientX - rect.left) / rect.width;  // 0-1 正規化
const y = (event.clientY - rect.top) / rect.height;  // 0-1 正規化
```

#### Modified Hausdorff Distance 實作

```javascript
function modifiedHausdorff(A, B) {
    // A, B 都是點的陣列 [{x, y}, ...]
    const forwardDist = mean(A.map(a =>
        Math.min(...B.map(b => distance(a, b)))
    ));
    const reverseDist = mean(B.map(b =>
        Math.min(...A.map(a => distance(a, b)))
    ));
    return Math.max(forwardDist, reverseDist);
}
```

#### 點集合正規化

```javascript
// 1. 平移不變：移到重心
const centroid = {
    x: mean(points.map(p => p.x)),
    y: mean(points.map(p => p.y))
};
const centered = points.map(p => ({
    x: p.x - centroid.x,
    y: p.y - centroid.y
}));

// 2. 縮放不變：RMS 正規化
const rms = Math.sqrt(mean(centered.map(p => p.x*p.x + p.y*p.y)));
const normalized = centered.map(p => ({
    x: p.x / rms,
    y: p.y / rms
}));
```

#### 相似度轉換

```javascript
function distanceToSimilarity(distance, maxDistance = 0.5) {
    const similarity = Math.max(0, 1 - distance / maxDistance);
    return Math.round(similarity * 100);
}
```

### 來自 PRD 的實作細節
> **文件路徑：** 參考上方 PRD 參考章節

#### 資料結構

```json
{
  "routes": [
    {
      "id": "uuid",
      "name": "路線名稱",
      "images": [
        {
          "id": "uuid",
          "filename": "images/xxx.jpg",
          "points": [{ "x": 0.25, "y": 0.33 }, ...],
          "normalizedPoints": [...]
        }
      ],
      "createdAt": "ISO timestamp"
    }
  ]
}
```

#### UI 配置參考

主畫面由上到下：
1. 圖片輸入按鈕（拍照/上傳）
2. 圖片顯示區（可點擊標記）
3. 清除按鈕
4. 搜尋結果列表（水平捲動）
5. 建立新路線按鈕
6. 查看所有路線按鈕

### 關鍵技術決策

#### 1. 多圖片搜尋策略
一條路線可有多張照片，每張照片有各自的標記點。搜尋時：
- 對路線內的每一組標記點都計算 MHD
- 取最小距離（最高相似度）作為該路線的相似度
- 這樣能增加「被搜尋到」的機會，驗證不同標記方式對匹配的影響

#### 2. OPFS 儲存結構
```
OPFS root/
├── routes.json      # 路線索引
└── images/          # 圖片目錄
    ├── {uuid}.jpg
    └── ...
```

#### 3. 不處理旋轉不變性
MVP 假設使用者大致正面拍攝，不加入 PCA 對齊。若後續發現問題再處理。

#### 4. maxDistance 預設值
初期設為 0.5，需根據實際使用資料調整。

#### 5. 搜尋結果數量
顯示前 10 名候選路線。
