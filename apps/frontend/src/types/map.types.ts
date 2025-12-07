/**
 * 지도 경계 (bounds)
 */
export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

/**
 * 지도 중심 좌표
 */
export interface MapCenter {
  lat: number;
  lng: number;
}

/**
 * 마커 데이터
 */
export interface MarkerData {
  id: string;
  position: MapCenter;
  title: string;
  category?: string;
  isSelected?: boolean;
}

/**
 * 지도 뷰포트 상태
 */
export interface MapViewport {
  center: MapCenter;
  zoom: number;
  bounds?: MapBounds;
}

/**
 * 클러스터 데이터
 */
export interface ClusterData {
  id: string;
  position: MapCenter;
  count: number;
  markers: MarkerData[];
}

