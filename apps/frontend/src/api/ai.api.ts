import axios from 'axios';
import type {
  InterpretedQuery,
  RecommendPlaceRequest,
  SummarizeReviewsRequest,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

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
 * AI 전용 클라이언트 (긴 타임아웃)
 */
const aiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000, // AI는 30초 타임아웃
});

// 응답에서 data 직접 반환
aiClient.interceptors.response.use(
  (response) => response.data,
  (error) => Promise.reject(error)
);

/**
 * 프론트엔드 폴백 해석 (AI 실패 시)
 */
const fallbackInterpret = (query: string): AISearchResponse => {
  const keywords: string[] = [];
  const categories: string[] = [];
  let location: string | undefined;

  // 카테고리 매칭
  const categoryMap: Record<string, string[]> = {
    '카페': ['카페', '커피', '디저트', '브런치'],
    '음식점': ['맛집', '음식점', '식당', '밥', '레스토랑'],
    '술집': ['술집', '바', '호프', '이자카야', '포차'],
  };
  
  for (const [category, words] of Object.entries(categoryMap)) {
    if (words.some(word => query.includes(word))) {
      categories.push(category);
    }
  }

  // 지역 추출
  const locationPatterns = [
    /([가-힣]+역)\s*(근처|주변)?/,
    /([가-힣]+동)\s*(근처|주변)?/,
    /([가-힣]+구)\s*(근처|주변)?/,
  ];
  
  for (const pattern of locationPatterns) {
    const match = query.match(pattern);
    if (match) {
      location = match[1];
      break;
    }
  }

  // 키워드 추출
  const stopWords = ['좋은', '있는', '추천', '해주세요', '알려', '찾아', '근처', '주변', '되는', '곳으로'];
  const words = query.split(/\s+/).filter(w => 
    w.length > 1 && !stopWords.some(sw => w.includes(sw))
  );
  keywords.push(...words.slice(0, 5));

  return {
    response: `"${query}"로 검색해볼게요! 🔍`,
    searchQuery: keywords.length > 0 ? keywords.join(' ') : query,
    keywords: keywords.length > 0 ? keywords : [query],
    categories,
    location,
  };
};

/**
 * AI를 통한 자연어 검색
 */
export const aiSearchAPI = async (query: string): Promise<AISearchResponse> => {
  try {
    // 토큰 가져오기
    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    const result = await aiClient.post<unknown, InterpretedQuery>('/ai/interpret', { query }, { headers });
    
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
    // 개발 환경에서만 로깅
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn('AI 해석 실패, 폴백 사용:', error instanceof Error ? error.message : 'Unknown');
    }
    
    // AI 실패 시 프론트엔드 폴백 해석 사용
    return fallbackInterpret(query);
  }
};

/**
 * 인증 헤더 가져오기
 */
const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * AI 장소 추천
 */
export const aiRecommendAPI = async (request: RecommendPlaceRequest) => {
  const response = await aiClient.post<unknown, unknown>('/ai/recommend', request, { headers: getAuthHeaders() });
  return response;
};

/**
 * AI 리뷰 요약
 */
export const aiSummarizeReviewsAPI = async (request: SummarizeReviewsRequest): Promise<string> => {
  const response = await aiClient.post<unknown, { summary: string }>('/ai/summarize', request, { headers: getAuthHeaders() });
  return response.summary || '';
};

/**
 * AI 장소 비교
 */
export const aiComparePlacesAPI = async (places: Array<{ name: string; description?: string }>): Promise<string> => {
  const response = await aiClient.post<unknown, { comparison: string }>('/ai/compare', { places }, { headers: getAuthHeaders() });
  return response.comparison || '';
};

/**
 * AI 헬스 체크
 */
export const aiHealthCheckAPI = async (): Promise<boolean> => {
  try {
    const response = await aiClient.get<unknown, { status: string; modelAvailable: boolean }>('/ai/health');
    // 백엔드는 'ok', 'warning', 'error' 상태를 반환
    return response.status === 'ok' || response.status === 'warning';
  } catch {
    return false;
  }
};
