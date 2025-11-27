/**
 * 座標點
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * 路線圖片
 */
export interface RouteImage {
  id: string;
  filename: string;
  points: Point[];
  normalizedPoints: Point[];
}

/**
 * 路線
 */
export interface Route {
  id: string;
  name: string;
  images: RouteImage[];
  createdAt: string;
}

/**
 * 路線資料結構（儲存用）
 */
export interface RoutesData {
  routes: Route[];
}
