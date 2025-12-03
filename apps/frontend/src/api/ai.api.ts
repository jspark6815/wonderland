import { apiClient } from './client';

export interface AIInterpretationResult {
  searchQuery: string;
  categories: string[];
  keywords: string[];
  location?: string;
  atmosphere?: string[];
  priceRange?: string;
  situation?: string;
  specialRequests?: string[];
  response: string;
}

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
    const result = await apiClient.post<AIInterpretationResult>('/ai/interpret', {
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
  } catch (error) {
    console.error('AI 해석 실패:', error);
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
export const aiRecommendAPI = async (preferences: {
  preferences: string[];
  location?: string;
  budget?: string;
  occasion?: string;
}) => {
  const response = await apiClient.post('/ai/recommend', preferences);
  return response;
};

/**
 * AI 리뷰 요약
 */
export const aiSummarizeReviewsAPI = async (reviews: string[]): Promise<string> => {
  const response = await apiClient.post<{ summary: string }>('/ai/summarize', { reviews });
  return response.summary || '';
};

/**
 * AI 장소 비교
 */
export const aiComparePlacesAPI = async (places: any[]): Promise<string> => {
  const response = await apiClient.post<{ comparison: string }>('/ai/compare', { places });
  return response.comparison || '';
};

/**
 * AI 헬스 체크
 */
export const aiHealthCheckAPI = async (): Promise<boolean> => {
  try {
    const response = await apiClient.get<{ status: string }>('/ai/health');
    return response.status === 'healthy';
  } catch {
    return false;
  }
};
