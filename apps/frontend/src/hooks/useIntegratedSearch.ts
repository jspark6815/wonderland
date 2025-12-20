import { useState, useCallback } from 'react';
import { Place } from '@wonderland/shared';
import { searchPlacesAPI, getNearbyPlacesAPI } from '@/api/places.api';
import { aiSearchAPI } from '@/api/ai.api';

interface IntegratedSearchResult {
  places: Place[];
  aiInterpretation?: {
    categories?: string[];
    keywords?: string[];
    location?: string;
  };
  isFromAI: boolean;
}

interface SearchOptions {
  category?: string | null;
  lat?: number;
  lng?: number;
  radius?: number;
  useAI?: boolean; // AI 사용 여부 (기본값: false)
}

export const useIntegratedSearch = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchResult, setSearchResult] = useState<IntegratedSearchResult>({
    places: [],
    isFromAI: false,
  });

  /**
   * 통합 검색
   * - useAI: false (기본값) → 바로 DB 검색 (빠름)
   * - useAI: true → AI 해석 후 DB 검색 (AI Chat용)
   */
  const search = useCallback(async (
    query: string, 
    options?: SearchOptions
  ): Promise<IntegratedSearchResult> => {
    setIsLoading(true);
    setError(null);

    try {
      let aiInterpretation: IntegratedSearchResult['aiInterpretation'] = undefined;
      let searchKeywords = query;
      
      // AI 사용 시에만 AI 해석 호출 (기본값: false)
      if (options?.useAI) {
        try {
          const aiResult = await aiSearchAPI(query);
          if (aiResult && (aiResult.keywords || aiResult.categories || aiResult.location)) {
            searchKeywords = aiResult.searchQuery || query;
            aiInterpretation = {
              keywords: aiResult.keywords || [],
              categories: aiResult.categories || [],
              location: aiResult.location,
            };
          }
        } catch {
          // AI 해석 실패 시 일반 검색으로 진행
        }
      }

      // 장소 검색 (카테고리 + 위치 필터 적용)
      const filters: Record<string, unknown> = {};
      
      if (options?.category) {
        filters.category = options.category;
      }
      
      // 위치 기반 검색 (현재 지도 중심 기준)
      if (options?.lat && options?.lng) {
        filters.lat = options.lat;
        filters.lng = options.lng;
        filters.radius = options.radius || 5000;
      }
      
      const places = await searchPlacesAPI(searchKeywords, Object.keys(filters).length > 0 ? filters : undefined);
      
      const result: IntegratedSearchResult = {
        places,
        aiInterpretation,
        isFromAI: !!aiInterpretation,
      };

      setSearchResult(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '검색 실패';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * 주변 장소 검색
   */
  const searchNearby = useCallback(async (
    lat: number,
    lng: number,
    radius: number = 1000
  ): Promise<Place[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const places = await getNearbyPlacesAPI(lat, lng, radius);
      
      setSearchResult({
        places,
        isFromAI: false,
      });
      
      return places;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '주변 검색 실패';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * 검색 결과 초기화
   */
  const clearSearch = useCallback(() => {
    setSearchResult({
      places: [],
      isFromAI: false,
    });
    setError(null);
  }, []);

  return {
    search,
    searchNearby,
    clearSearch,
    places: searchResult.places,
    aiInterpretation: searchResult.aiInterpretation,
    isFromAI: searchResult.isFromAI,
    isLoading,
    error,
  };
};
