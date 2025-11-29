import { apiClient } from './client';
import { Place, SearchFilters } from '@wonderland/shared';

export const searchPlacesAPI = async (query: string, filters?: SearchFilters): Promise<Place[]> => {
  const params = {
    q: query,
    ...filters,
  };
  
  const response = await apiClient.get('/places/search', { params });
  return response.data;
};

export const getNearbyPlacesAPI = async (
  lat: number,
  lng: number,
  radius: number = 1000
): Promise<Place[]> => {
  const response = await apiClient.get('/places/nearby', {
    params: { lat, lng, radius },
  });
  return response.data;
};

export const getPlaceDetailAPI = async (placeId: string): Promise<Place> => {
  const response = await apiClient.get(`/places/${placeId}`);
  return response.data;
};

export const getPopularPlacesAPI = async (): Promise<Place[]> => {
  const response = await apiClient.get('/places/popular');
  return response.data;
};
