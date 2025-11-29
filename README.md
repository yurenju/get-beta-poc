# 抱石路線標註與匹配 POC

透過標註照片上的岩點位置來識別和匹配抱石路線的技術驗證專案。

## 功能特色

- **圖片標記**：在照片上點擊標記岩點位置
- **即時搜尋**：標記時自動搜尋相似路線
- **路線管理**：建立、查看、刪除路線
- **多圖片支援**：一條路線可關聯多張照片
- **離線儲存**：使用 OPFS 在瀏覽器本地儲存資料

## 技術棧

- React 19 + TypeScript
- Vite
- Origin Private File System (OPFS) - 瀏覽器本地儲存
- 組合匹配演算法 (MHD + DTW 順序匹配) - 對不同拍攝角度有較好容忍度

## 快速開始

```bash
# 安裝依賴
npm install

# 啟動開發伺服器
npm run dev

# 建置
npm run build

# 執行測試
npm test
```

開啟 http://localhost:5173 即可使用。

## 使用方式

1. **拍照/上傳圖片**：點擊「拍照」或「上傳圖片」按鈕
2. **標記岩點**：在圖片上點擊標記岩點位置（建議 3-5 個點）
3. **查看搜尋結果**：標記時會即時顯示相似路線
4. **建立新路線**：若找不到匹配，點擊「建立新路線」儲存
5. **加入現有路線**：點擊候選路線卡片，可將照片加入該路線

## 專案結構

```
src/
├── components/          # UI 元件
│   ├── ImageMarker.tsx     # 圖片標記元件
│   ├── ImageInput.tsx      # 圖片輸入元件
│   ├── SearchResults.tsx   # 搜尋結果列表
│   ├── RouteCard.tsx       # 路線卡片
│   ├── RouteDetailModal.tsx # 路線詳情彈窗
│   ├── RouteListModal.tsx  # 路線清單彈窗
│   └── CreateRouteModal.tsx # 建立路線彈窗
├── hooks/
│   └── useRoutes.ts        # 路線資料管理 hook
├── lib/
│   ├── storage.ts          # OPFS 儲存封裝
│   └── matching.ts         # MHD 匹配演算法
├── types/
│   └── route.ts            # TypeScript 型別定義
└── App.tsx                 # 主應用程式
```

## 技術決策

### MHD 演算法
使用 Modified Hausdorff Distance 計算點集合相似度：
- 對位置偏差有良好容忍度（5-10% 偏差仍可達 100% 相似度）
- 對漏標點較敏感（漏 1-2 個點會顯著降低相似度）

### 多圖片搜尋策略
一條路線可有多張照片，搜尋時取與所有圖片中最高的相似度作為該路線的匹配分數。

### OPFS 儲存
- `routes.json` - 路線索引資料
- `images/` - 圖片檔案目錄

## 相關文件

- [PRD 文件](docs/specs/2025-11-27-route-matching-poc/prd.md)
- [驗收測試報告](docs/specs/2025-11-27-route-matching-poc/acceptance-report.md)
- [技術研究](docs/research/2025-11-27-bouldering-video-route-matching.md)
