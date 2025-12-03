import { apiClient } from './client';
import { Place, SearchFilters } from '@wonderland/shared';

/**
 * 장소 검색
 */
export const searchPlacesAPI = async (query: string, filters?: SearchFilters): Promise<Place[]> => {
  const params = {
    query, // 백엔드 DTO는 'query' 필드를 기대
    ...filters,
  };
  
  // apiClient의 response interceptor가 이미 response.data를 반환함
  const data = await apiClient.get<Place[]>('/places/search', { params });
  return data as unknown as Place[];
};

/**
 * 주변 장소 검색
 */
export const getNearbyPlacesAPI = async (
  lat: number,
  lng: number,
  radius: number = 1000
): Promise<Place[]> => {
  const data = await apiClient.get<Place[]>('/places/nearby', {
    params: { lat, lng, radius },
  });
  return data as unknown as Place[];
};

/**
 * 장소 상세 정보 (ID로 조회)
 */
export const getPlaceDetailAPI = async (placeId: string): Promise<Place> => {
  const data = await apiClient.get<Place>(`/places/${placeId}`);
  return data as unknown as Place;
};

/**
 * 장소 상세 정보 (이름과 좌표로 조회)
 */
export const getPlaceDetailByLocationAPI = async (
  name: string,
  lat: number,
  lng: number
): Promise<Place> => {
  const data = await apiClient.get<Place>('/places/detail/by-location', {
    params: { name, lat, lng },
  });
  return data as unknown as Place;
};

/**
 * 인기 장소 조회
 */
export const getPopularPlacesAPI = async (): Promise<Place[]> => {
  const data = await apiClient.get<Place[]>('/places/popular');
  return data as unknown as Place[];
};

/**
 * 지도 영역 기반 장소 검색
 */
export const searchPlacesByBoundsAPI = async (
  south: number,
  north: number,
  west: number,
  east: number,
  category?: string,
  limit: number = 50
): Promise<Place[]> => {
  const params: Record<string, unknown> = {
    south,
    north,
    west,
    east,
    limit,
  };
  
  if (category) {
    params.category = category;
  }
  
  const data = await apiClient.get<Place[]>('/places/bounds', { params });
  return data as unknown as Place[];
};
