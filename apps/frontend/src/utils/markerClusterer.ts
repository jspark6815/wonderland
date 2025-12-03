/**
 * 네이버 지도 마커 클러스터링 유틸리티
 * 네이버 지도 API의 MarkerClusterer를 사용
 */

interface ClusterOptions {
  minClusterSize?: number;
  maxZoom?: number;
  gridSize?: number;
  icons?: any[];
  styles?: any[];
  disableClickZoom?: boolean;
}

/**
 * 마커 클러스터 생성
 */
export const createMarkerCluster = (
  map: naver.maps.Map,
  markers: naver.maps.Marker[],
  options: ClusterOptions = {}
): any => {
  if (!window.naver?.maps?.MarkerClusterer) {
    console.warn('MarkerClusterer가 로드되지 않았습니다. 마커 클러스터링을 사용할 수 없습니다.');
    return null;
  }

  const defaultOptions = {
    minClusterSize: 2,
    maxZoom: 18,
    gridSize: 60,
    disableClickZoom: false,
    ...options,
  };

  const clusterer = new window.naver.maps.MarkerClusterer({
    map,
    markers,
    ...defaultOptions,
  });

  return clusterer;
};

/**
 * 마커 클러스터 업데이트
 */
export const updateMarkerCluster = (
  clusterer: any,
  markers: naver.maps.Marker[]
): void => {
  if (!clusterer) return;
  
  clusterer.clearMarkers();
  clusterer.addMarkers(markers);
};

/**
 * 마커 클러스터 제거
 */
export const removeMarkerCluster = (clusterer: any): void => {
  if (!clusterer) return;
  
  clusterer.clearMarkers();
  clusterer.setMap(null);
};

