import { useState, useCallback } from 'react';
import { Place } from '@wonderland/shared';
import { searchPlacesAPI } from '@/api/places.api';
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

export const useIntegratedSearch = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchResult, setSearchResult] = useState<IntegratedSearchResult>({
    places: [],
    isFromAI: false,
  });

  /**
   * 통합 검색: AI 해석 + 장소 검색
   */
  const search = useCallback(async (query: string): Promise<IntegratedSearchResult> => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. AI로 자연어 해석 시도
      let aiInterpretation = null;
      let searchKeywords = query;
      
      try {
        const aiResult = await aiSearchAPI(query);
        if (aiResult.searchQuery) {
          searchKeywords = aiResult.searchQuery;
          aiInterpretation = {
            keywords: aiResult.keywords || [],
            categories: aiResult.categories || [],
            location: aiResult.location,
          };
        }
      } catch (aiError) {
        console.log('AI 해석 실패, 일반 검색으로 진행:', aiError);
      }

      // 2. 장소 검색
      const places = await searchPlacesAPI(searchKeywords);
      
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
      const response = await fetch(
        `/api/v1/places/nearby?lat=${lat}&lng=${lng}&radius=${radius}`
      );
      
      if (!response.ok) {
        throw new Error('주변 검색 실패');
      }

      const places = await response.json();
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
