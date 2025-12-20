import { useState, useRef } from 'react';
import { aiSearchAPI, AISearchResponse, SearchContext } from '@/api/ai.api';

/**
 * AI 검색 결과 타입 (AISearchResponse 확장)
 */
export interface AISearchResult extends AISearchResponse {
  places?: unknown[];
  followUpQuestions?: string[]; // 맞춤형 후속 질문
}

export const useAISearch = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 검색 컨텍스트 유지 (이전 검색 정보)
  const contextRef = useRef<SearchContext>({});

  const searchWithAI = async (query: string): Promise<AISearchResult> => {
    setIsLoading(true);
    setError(null);

    try {
      // 이전 컨텍스트와 함께 검색
      const result = await aiSearchAPI(query, contextRef.current);
      
      // 검색 결과를 컨텍스트에 저장 (다음 후속 질문을 위해)
      contextRef.current = {
        lastSearchQuery: result.searchQuery,
        lastKeywords: result.keywords,
        lastCategories: result.categories,
        lastLocation: result.location,
        lastAtmosphere: result.atmosphere,
        lastResultCount: result.places?.length || 0, // 결과 수도 저장
      };
      
      return result as AISearchResult;
    } catch (err: unknown) {
      let errorMessage = '알 수 없는 오류가 발생했습니다.';
      
      const error = err as { response?: { data?: { message?: string } }; message?: string; code?: string };
      
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      
      // 네트워크 오류인 경우
      if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
        errorMessage = '요청 시간이 초과되었습니다. AI 서비스가 응답하지 않습니다.';
      } else if (error?.code === 'ERR_NETWORK' || error?.message?.includes('Network Error')) {
        errorMessage = '네트워크 오류가 발생했습니다. 서버 연결을 확인해주세요.';
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // 컨텍스트 초기화 (새 대화 시작 시)
  const resetContext = () => {
    contextRef.current = {};
  };

  return {
    searchWithAI,
    resetContext,
    isLoading,
    error,
  };
};
