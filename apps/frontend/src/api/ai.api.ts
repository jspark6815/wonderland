import { apiClient } from './client';
import type {
  InterpretedQuery,
  RecommendPlaceRequest,
  SummarizeReviewsRequest,
} from '../types';

/**
 * AI 검색 응답 (프론트엔드 전용)
 */
export interface AISearchResponse {
  response: string;
  searchQuery: string;
  keywords: string[];
  categories: string[];
  location?: string;
  atmosphere?: string[];
  situation?: string;
}

/**
 * AI를 통한 자연어 검색
 */
export const aiSearchAPI = async (query: string): Promise<AISearchResponse> => {
  try {
    const result = await apiClient.post<InterpretedQuery>('/ai/interpret', {
      query,
    });
    
    return {
      response: result.response || `"${query}"를 검색해볼게요! 🔍`,
      searchQuery: result.searchQuery || query,
      keywords: result.keywords || [query],
      categories: result.categories || [],
      location: result.location,
      atmosphere: result.atmosphere,
      situation: result.situation,
    };
  } catch {
    // 개발 환경에서만 로깅
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error('AI 해석 실패');
    }
    return {
      response: `"${query}"로 검색해볼게요!`,
      searchQuery: query,
      keywords: [query],
      categories: [],
    };
  }
};

/**
 * AI 장소 추천
 */
export const aiRecommendAPI = async (request: RecommendPlaceRequest) => {
  const response = await apiClient.post('/ai/recommend', request);
  return response;
};

/**
 * AI 리뷰 요약
 */
export const aiSummarizeReviewsAPI = async (request: SummarizeReviewsRequest): Promise<string> => {
  const response = await apiClient.post<{ summary: string }>('/ai/summarize', request);
  return response.summary || '';
};

/**
 * AI 장소 비교
 */
export const aiComparePlacesAPI = async (places: Array<{ name: string; description?: string }>): Promise<string> => {
  const response = await apiClient.post<{ comparison: string }>('/ai/compare', { places });
  return response.comparison || '';
};

/**
 * AI 헬스 체크
 */
export const aiHealthCheckAPI = async (): Promise<boolean> => {
  try {
    const response = await apiClient.get<{ status: string; modelAvailable: boolean }>('/ai/health');
    // 백엔드는 'ok', 'warning', 'error' 상태를 반환
    return response.status === 'ok' || response.status === 'warning';
  } catch {
    return false;
  }
};
