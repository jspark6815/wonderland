/**
 * 네이버 지도 API의 장소 검색 기능 활용
 */

interface NaverPlaceSearchOptions {
  query?: string;
  bounds?: {
    south: number;
    north: number;
    west: number;
    east: number;
  };
  category?: string;
  limit?: number;
}

interface NaverPlaceResult {
  id: string;
  name: string;
  address: string;
  roadAddress?: string;
  latitude: number;
  longitude: number;
  category?: string;
  phone?: string;
  distance?: number;
}

/**
 * 네이버 지도 API를 사용한 장소 검색
 */
export const searchNaverPlaces = async (
  options: NaverPlaceSearchOptions
): Promise<NaverPlaceResult[]> => {
  if (!window.naver?.maps) {
    throw new Error('네이버 지도 API가 로드되지 않았습니다.');
  }

  return new Promise((resolve, reject) => {
    const { query, bounds, category, limit = 20 } = options;

    // 네이버 지도 장소 검색 서비스
    const ps = new window.naver.maps.services.Places();

    const searchOptions: any = {
      query: query || '',
      bounds: bounds
        ? new window.naver.maps.LatLngBounds(
            new window.naver.maps.LatLng(bounds.south, bounds.west),
            new window.naver.maps.LatLng(bounds.north, bounds.east)
          )
        : undefined,
      category: category,
    };

    ps.search(searchOptions, (status: any, response: any) => {
      if (status === window.naver.maps.services.Status.ERROR) {
        reject(new Error('네이버 장소 검색 실패'));
        return;
      }

      if (status === window.naver.maps.services.Status.OK) {
        const results: NaverPlaceResult[] = response.v2.results
          .slice(0, limit)
          .map((item: any) => ({
            id: item.id || `naver_${item.x}_${item.y}`,
            name: item.name || '',
            address: item.address || '',
            roadAddress: item.roadAddress || '',
            latitude: parseFloat(item.y) || 0,
            longitude: parseFloat(item.x) || 0,
            category: item.category || '',
            phone: item.tel || '',
            distance: item.distance ? parseFloat(item.distance) : undefined,
          }));

        resolve(results);
      } else {
        resolve([]);
      }
    });
  });
};

/**
 * 네이버 지도 API를 사용한 키워드 검색
 */
export const searchNaverPlacesByKeyword = async (
  keyword: string,
  bounds?: {
    south: number;
    north: number;
    west: number;
    east: number;
  },
  limit: number = 20
): Promise<NaverPlaceResult[]> => {
  return searchNaverPlaces({
    query: keyword,
    bounds,
    limit,
  });
};

/**
 * 네이버 지도 API를 사용한 카테고리 검색
 */
export const searchNaverPlacesByCategory = async (
  category: string,
  bounds: {
    south: number;
    north: number;
    west: number;
    east: number;
  },
  limit: number = 20
): Promise<NaverPlaceResult[]> => {
  return searchNaverPlaces({
    category,
    bounds,
    limit,
  });
};

