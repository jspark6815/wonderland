/**
 * 장소 카테고리
 */
export enum PlaceCategory {
  RESTAURANT = 'RESTAURANT',
  CAFE = 'CAFE',
  ACCOMMODATION = 'ACCOMMODATION',
  SHOPPING = 'SHOPPING',
  CULTURE = 'CULTURE',
  HEALTHCARE = 'HEALTHCARE',
}

/**
 * 위도/경도 좌표
 */
export type Coordinates = {
  lat: number;
  lng: number;
};

/**
 * 장소 정보
 */
export type Place = {
  id: string;
  name: string;
  category: PlaceCategory;
  location: Coordinates;
  address: string;
  description?: string;
  rating: number;
  reviewCount: number;
  images?: string[];
  distance?: number;
  createdAt: string;
  updatedAt: string;
};

