# 室內抱石路線標註與匹配技術研究

## 執行摘要

本研究針對「如何讓使用者透過標註照片來識別和分享抱石路線」這個問題進行技術探討。我們將問題轉化為「點集合的空間配置匹配」，採用手機 Web App 的形式，讓使用者直接點擊照片上的岩點來標註。

核心流程是：使用者拍攝路線正面照片，點擊岩點位置進行標註（像標記星座一樣），系統提取這些點的相對位置形成「路線指紋」，再與資料庫中的路線比對。匹配成功則回傳對應的 hashtag，讓使用者可以在 IG 上找到或分享相關影片。

關鍵技術挑戰包括：
1. 如何處理不同拍攝距離和角度造成的縮放、平移差異
2. **如何容忍使用者漏點（少標了某些岩點）或多點（多標了不相關的點）**

我們建議採用**修正版 Hausdorff 距離（Modified Hausdorff Distance）**作為核心匹配演算法，這種方法天然支援部分匹配，對漏點和多點都有良好的容忍度。

## 背景與脈絡

### 問題定義

**使用者流程（上傳者）：**
1. 打開手機 Web App
2. 拍攝或上傳路線正面照片
3. 點擊岩點位置進行標註（像標記星座）
4. 系統搜尋是否有相似路線，列出候選
5. 確認後取得 hashtag
6. 到 IG 上傳影片並標上這個 hashtag

**使用者流程（搜尋者）：**
1. 打開手機 Web App
2. 拍攝或上傳路線照片
3. 點擊岩點位置進行標註
4. 系統搜尋相似路線
5. 取得 hashtag 後到 IG 搜尋相關影片

### 技術約束（MVP 版本）

- **平台**：手機 Web App（非原生 App）
- **標註方式**：點擊標記（非畫圈）
- **容錯要求**：必須能處理漏點和多點的情況

### 為什麼點擊標記更適合 MVP？

1. **實作簡單**：Web 的 touch/click 事件處理比圓形手勢辨識簡單得多
2. **精確度高**：點擊位置就是座標，不需要計算圓心
3. **使用者體驗直覺**：「點哪裡就標哪裡」，無需學習
4. **視覺效果**：標記後的點看起來像星座，很有辨識度

## 技術分析

### 第一層：手機 Web App 的點擊標記

#### 技術實作

根據 [MDN 的 Pointer Events 指南](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events/Using_Pointer_Events)，建議使用 Pointer Events API 而非分別處理 touch 和 mouse 事件：

> "因為 pointer events 是設備無關的，應用程式可以用相同的程式碼接收來自滑鼠、觸控筆或手指的座標輸入。"

基本實作流程：
1. 在 `<canvas>` 或 `<div>` 上載入照片
2. 監聽 `pointerdown` 事件
3. 計算點擊位置相對於圖片的座標（需考慮圖片縮放）
4. 在該位置顯示標記點
5. 提供「撤銷」功能讓使用者移除誤點

根據 [HTML5 Canvas Touch Events 教學](https://bencentra.com/code/2014/12/05/html5-canvas-touch-events.html)，取得正確座標的關鍵是：

```javascript
// 取得相對於 canvas 的座標
const rect = canvas.getBoundingClientRect();
const x = (event.clientX - rect.left) / scale;
const y = (event.clientY - rect.top) / scale;
```

#### 座標正規化

由於不同使用者的照片尺寸和螢幕大小不同，需要將座標正規化：
- 將 x 座標除以圖片寬度，得到 0-1 之間的值
- 將 y 座標除以圖片高度，得到 0-1 之間的值

這樣不同尺寸的照片就能產生可比較的座標。

### 第二層：容忍漏點/多點的匹配演算法

這是整個系統最關鍵的部分。使用者標註時可能會：
- **漏點**：沒有標到所有岩點（可能沒注意到、太小、被遮住）
- **多點**：多標了不屬於這條路線的點（誤觸、標到旁邊路線的岩點）

傳統的「完全匹配」演算法無法處理這種情況，我們需要「部分匹配」演算法。

#### 方案 A：修正版 Hausdorff 距離（Modified Hausdorff Distance）- 建議採用

[Hausdorff 距離](https://en.wikipedia.org/wiki/Hausdorff_distance)是衡量兩個點集合「距離」的經典方法。根據 [Stanford 的講義](https://web.stanford.edu/class/cs273/scribing/2004/class8/scribe8.pdf)：

> "Hausdorff 距離可能是衡量點集合之間距離最自然的函數。更重要的是，它可以輕鬆應用於部分匹配問題。"

**標準 Hausdorff 距離**的問題是對離群點（outliers）非常敏感——只要有一個點差很遠，整體距離就會很大。

**修正版 Hausdorff 距離（MHD）** 解決了這個問題。根據 [Dubuisson & Jain 的論文](https://ieeexplore.ieee.org/document/576361/)，MHD 使用「平均最近距離」而非「最大最近距離」：

```
MHD(A, B) = max(
    mean(min_distance(a, B) for a in A),
    mean(min_distance(b, A) for b in B)
)
```

實作非常簡單（[參考 Python 實作](https://github.com/mavillan/py-hausdorff)）：

```javascript
function modifiedHausdorff(A, B) {
    // A, B 都是點的陣列 [{x, y}, ...]

    // 計算 A 中每個點到 B 的最近距離，取平均
    const forwardDist = mean(A.map(a =>
        Math.min(...B.map(b => distance(a, b)))
    ));

    // 計算 B 中每個點到 A 的最近距離，取平均
    const reverseDist = mean(B.map(b =>
        Math.min(...A.map(a => distance(a, b)))
    ));

    return Math.max(forwardDist, reverseDist);
}
```

**為什麼 MHD 能容忍漏點和多點？**

- **漏點情況**：如果 A 比 B 少幾個點，那些 B 中的「多餘」點會各自找到 A 中最近的點，距離不會太大
- **多點情況**：如果 A 比 B 多幾個「離群」點，這些點的距離會被平均稀釋，不會主導整體結果

#### 方案 B：部分 Hausdorff 距離（Partial Hausdorff Distance）

如果想要更強的離群點容忍度，可以使用「第 k 百分位」而非平均：

> "在 k < m 的情況下，可能有 m - k 個離群點而不影響 Hausdorff 距離。當物體被部分遮擋或快速變形時，這是非常有用的特性。"

例如，使用第 90 百分位，就能忽略最差的 10% 匹配點。

#### 方案 C：基於圖的匹配（Graph-Based Matching）

將點集合轉換成圖（使用 Delaunay 三角剖分或 k-近鄰圖），然後比較圖的結構。根據 [相關研究](https://www.sciencedirect.com/science/article/abs/pii/0031320383900341)：

> "使用 Delaunay 三角剖分將點集合劃分成三角形，然後使用一致性圖的最大團來獲得最大的相互一致點對集合。"

這種方法對部分匹配有很好的支援，但實作較複雜。

#### 建議方案

**MVP 階段採用修正版 Hausdorff 距離（MHD）**，原因：
1. 實作簡單，純 JavaScript 即可完成
2. 天然支援部分匹配，不需要特別處理漏點/多點
3. 計算複雜度 O(n×m)，對於 10-20 個點的路線完全可以接受
4. 有成熟的理論基礎和實務驗證

### 第三層：處理縮放和平移

不同使用者拍攝的照片會有不同的：
- **縮放**：拍攝距離不同
- **平移**：構圖位置不同
- **輕微旋轉**：手機沒有完全水平

MHD 本身不具備這些不變性，需要先對點集合進行正規化。

#### 正規化步驟

1. **平移不變**：將點集合的重心移到原點
   ```javascript
   const centroid = {
       x: mean(points.map(p => p.x)),
       y: mean(points.map(p => p.y))
   };
   const centered = points.map(p => ({
       x: p.x - centroid.x,
       y: p.y - centroid.y
   }));
   ```

2. **縮放不變**：將點集合縮放到標準大小（例如使用 RMS 距離）
   ```javascript
   const rms = Math.sqrt(mean(centered.map(p => p.x*p.x + p.y*p.y)));
   const normalized = centered.map(p => ({
       x: p.x / rms,
       y: p.y / rms
   }));
   ```

3. **旋轉不變**（可選）：如果需要處理旋轉，可以使用主成分分析（PCA）對齊主軸。但對於「大致正面拍攝」的假設，可以先跳過這步。

### 第四層：搜尋與排名

#### 暴力搜尋（MVP 適用）

對於 MVP 階段，如果資料庫中的路線數量不多（< 10000），可以直接暴力搜尋：

```javascript
function searchRoutes(queryPoints, database, filters) {
    // 1. 先用結構化條件過濾
    const candidates = database.filter(route =>
        route.gym === filters.gym &&
        Math.abs(route.pointCount - queryPoints.length) <= 3 &&
        route.createdAt > filters.minDate
    );

    // 2. 計算 MHD 並排序
    const results = candidates.map(route => ({
        route,
        distance: modifiedHausdorff(
            normalize(queryPoints),
            normalize(route.points)
        )
    }));

    // 3. 按距離排序，距離越小越相似
    return results.sort((a, b) => a.distance - b.distance);
}
```

#### 回傳結果的設計

為了處理演算法的不確定性，建議：
1. 回傳相似度最高的 5-10 個候選
2. 顯示每個候選的預覽圖（原始標註照片的縮圖）
3. 顯示相似度分數（可以轉換成百分比）
4. 讓使用者確認「是這條路線嗎？」

這種設計的好處：
- 即使演算法不完美，使用者也能在候選中找到正確答案
- 收集「使用者選了哪個」的資料，可用於未來改進演算法

### 第五層：相似度分數的轉換

MHD 回傳的是「距離」，數值越小越相似。為了讓使用者更容易理解，可以轉換成「相似度百分比」：

```javascript
function distanceToSimilarity(distance, maxDistance = 0.5) {
    // 距離為 0 時相似度 100%，距離為 maxDistance 時相似度 0%
    const similarity = Math.max(0, 1 - distance / maxDistance);
    return Math.round(similarity * 100);
}
```

`maxDistance` 需要根據實際資料調整。初期可以設一個保守的值，收集資料後再優化。

## 整體系統架構

```
┌─────────────────────────────────────────────────────────────┐
│                    手機 Web App（前端）                      │
├─────────────────────────────────────────────────────────────┤
│  技術棧：HTML5 Canvas + Pointer Events + 現代前端框架        │
│                                                             │
│  1. 載入照片（拍照或從相簿選取）                            │
│  2. 在照片上點擊標記岩點（支援撤銷）                        │
│  3. 選擇場館（GPS 自動偵測 或 手動選擇）                    │
│  4. 提交標註資料                                            │
│  5. 顯示搜尋結果（候選列表 + 預覽圖）                       │
│  6. 使用者確認 → 取得 hashtag                               │
└─────────────────────────────────────────────────────────────┘
                          ↓ API 呼叫
┌─────────────────────────────────────────────────────────────┐
│                      後端服務                                │
├─────────────────────────────────────────────────────────────┤
│  搜尋 API：POST /api/search                                 │
│  - 輸入：{ points: [{x, y}, ...], gymId, color? }           │
│  - 處理：                                                   │
│    1. 正規化查詢點集合                                      │
│    2. 過濾（場館、點數範圍、時間）                          │
│    3. 對候選路線計算 MHD                                    │
│    4. 排序並回傳 top N                                      │
│  - 輸出：[{ routeId, hashtag, similarity, thumbnailUrl }]   │
├─────────────────────────────────────────────────────────────┤
│  確認 API：POST /api/confirm                                │
│  - 輸入：{ queryPoints, selectedRouteId }                   │
│  - 處理：記錄使用者確認，用於未來優化                       │
├─────────────────────────────────────────────────────────────┤
│  新增路線 API：POST /api/routes                             │
│  - 輸入：{ points, gymId, color, imageUrl }                 │
│  - 處理：                                                   │
│    1. 儲存原始點座標                                        │
│    2. 計算並儲存正規化座標                                  │
│    3. 產生唯一 hashtag                                      │
│  - 輸出：{ routeId, hashtag }                               │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                       資料儲存                               │
├─────────────────────────────────────────────────────────────┤
│  路線資料表 routes：                                        │
│  - id, gym_id, color, hashtag                               │
│  - points_raw (JSONB)：原始正規化座標                       │
│  - point_count：岩點數量（用於快速過濾）                    │
│  - thumbnail_url：預覽圖 URL                                │
│  - created_at, updated_at                                   │
├─────────────────────────────────────────────────────────────┤
│  場館資料表 gyms：                                          │
│  - id, name, location (lat, lng)                            │
├─────────────────────────────────────────────────────────────┤
│  確認記錄表 confirmations（用於未來優化）：                 │
│  - query_points, selected_route_id, created_at              │
└─────────────────────────────────────────────────────────────┘
```

## 演算法細節：完整的匹配流程

```
輸入：使用者標記的點集合 Q = [{x, y}, ...]
輸出：相似度排序的路線列表

1. 座標正規化
   Q_norm = normalize(Q)
   - 計算重心並平移到原點
   - 計算 RMS 並縮放到標準大小

2. 候選過濾
   candidates = routes.filter(
     gym == selected_gym AND
     |point_count - len(Q)| <= 3 AND
     created_at > one_year_ago
   )

3. 計算相似度
   for each route R in candidates:
     R_norm = R.points_normalized  // 預先計算好的
     distance = MHD(Q_norm, R_norm)
     similarity = 1 - distance / max_distance

4. 排序並回傳
   return candidates.sort_by(similarity, desc).take(10)
```

## 關鍵技術決策

### 1. IG Hashtag 整合方案

#### 官方 API 的限制

Instagram Graph API 對 hashtag 搜尋有嚴格限制：
- 必須是 Business 或 Creator 帳號才能使用
- 每 7 天只能查詢 30 個不同的 hashtag
- 2024 年 9 月 Instagram Basic Display API 已被棄用
- 無法存取一般消費者帳號的資料

這些限制對我們的使用情境來說太嚴格，不適合直接整合官方 API。

#### 選擇的方案：直接連結到 IG 搜尋頁面

產生 hashtag 後，提供連結讓使用者直接跳轉到 IG 官方搜尋頁面：

```
https://www.instagram.com/explore/tags/{hashtag}/
```

例如：`https://www.instagram.com/explore/tags/climb_MBneihu_A7f3/`

**優點：**
- 實作最簡單，不需要任何 API 整合
- 使用者看到的是 IG 官方的最新結果
- 不依賴第三方服務的穩定性

**限制：**
- 使用者需要有 IG 帳號才能看到完整搜尋結果
- 無法在我們的 App 內直接顯示搜尋結果

這個限制是可以接受的，因為我們的目標使用者（攀岩愛好者）大多已經有 IG 帳號，而且他們本來就是要去 IG 上傳或搜尋影片。

### 2. 點數差異容忍度

建議設定為 ±3 個點：
- 太嚴格（±1）：漏標一個點就找不到
- 太寬鬆（±5）：搜尋結果太多，不精確

這個值可以在實際使用後根據資料調整。

### 3. MHD 的 max_distance 閾值

這決定了「多遠算不相似」。建議初期設為 0.3-0.5，然後：
- 收集「使用者選擇了排名第幾的結果」的資料
- 分析正確匹配和錯誤匹配的距離分布
- 調整閾值或訓練更複雜的模型

### 4. 是否需要處理旋轉？

MVP 階段建議**不處理旋轉**：
- 使用者通常會「大致正面」拍攝
- 加入旋轉不變性會增加計算複雜度
- 如果後續發現旋轉是問題，再加入 PCA 對齊

### 5. 儲存原始座標還是正規化座標？

建議**兩者都儲存**：
- 原始座標：用於顯示預覽、除錯
- 正規化座標：用於快速比對（避免每次都重新計算）

## 與之前方案的比較

| 面向 | 之前（畫圈 + 向量資料庫） | 現在（點擊 + MHD） |
|------|-------------------------|-------------------|
| 標註方式 | 畫圈 | 點擊 |
| 平台 | 原生 App | Web App |
| 匹配演算法 | 向量相似度 | Modified Hausdorff Distance |
| 漏點容忍 | 需要特別設計 | 天然支援 |
| 多點容忍 | 需要特別設計 | 天然支援 |
| 實作複雜度 | 中 | 低 |
| 需要向量資料庫 | 是 | 否（MVP 可用暴力搜尋） |

## 下一步行動計畫

### 概念驗證（PoC）

1. **演算法驗證**：
   - 收集 3-5 條路線，每條拍 3-5 張照片
   - 手動標註點座標（可用簡單的 HTML 頁面）
   - 實作 MHD 計算，驗證：
     - 同一條路線的距離是否明顯小於不同路線
     - 故意漏標或多標幾個點，距離變化多少

2. **前端原型**：
   - 建立簡單的 Web 頁面
   - 實作照片載入 + 點擊標記功能
   - 驗證在手機上的使用體驗

### MVP 開發

根據 PoC 結果：
- 建立完整的前後端架構
- 設計資料庫 schema
- 實作搜尋和新增路線 API
- 設計 hashtag 產生邏輯

## 參考資料

### Web 觸控/點擊事件
- [MDN Pointer Events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events/Using_Pointer_Events)
- [MDN Touch Events](https://developer.mozilla.org/en-US/docs/Web/API/Touch_events)
- [HTML5 Canvas Touch Events Tutorial](https://bencentra.com/code/2014/12/05/html5-canvas-touch-events.html)

### 點集合匹配演算法
- [Hausdorff Distance - Wikipedia](https://en.wikipedia.org/wiki/Hausdorff_distance)
- [Modified Hausdorff Distance for Object Matching (Dubuisson & Jain)](https://ieeexplore.ieee.org/document/576361/)
- [Hausdorff Distance - Stanford Lecture Notes](https://web.stanford.edu/class/cs273/scribing/2004/class8/scribe8.pdf)
- [py-hausdorff - Python 實作](https://github.com/mavillan/py-hausdorff)
- [SciPy directed_hausdorff](https://docs.scipy.org/doc/scipy/reference/generated/scipy.spatial.distance.directed_hausdorff.html)

### 部分匹配與離群點處理
- [A Robust Point Sets Matching Method](https://arxiv.org/abs/1411.0791)
- [Point Pattern Matching - Stack Overflow 討論](https://stackoverflow.com/questions/27823048/good-algorithm-for-finding-subsets-of-point-sets)
- [Fast Matching under Occlusions (UCSD)](https://cseweb.ucsd.edu/~jmcauley/pdfs/pr11.pdf)
