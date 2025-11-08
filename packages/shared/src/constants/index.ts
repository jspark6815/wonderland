/**
 * API 라우트 상수
 */
export const API_ROUTES = {
  BASE: '/api/v1',
  PLACES: {
    ROOT: '/places',
    DETAIL: (id: string) => `/places/${id}`,
    NEARBY: '/places/nearby',
    POPULAR: '/places/popular',
  },
  SEARCH: {
    ROOT: '/search',
    AUTOCOMPLETE: '/search/autocomplete',
    TRENDING: '/search/trending',
  },
  AI: {
    RECOMMEND: '/ai/recommend',
    RECOMMEND_STREAM: '/ai/recommend/stream',
    SUMMARIZE: '/ai/summarize',
  },
} as const;

/**
 * 캐시 TTL (초)
 */
export const CACHE_TTL = {
  PLACE_DETAIL: 3600,
  PLACE_SEARCH: 300,
  AI_RECOMMEND: 1800,
  AUTOCOMPLETE: 600,
} as const;

