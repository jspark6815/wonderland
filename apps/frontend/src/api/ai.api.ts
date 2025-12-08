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
  followUpQuestions?: string[]; // AI가 생성한 맞춤형 후속 질문
}

/**
 * 검색 컨텍스트 (후속 질문용)
 */
export interface SearchContext {
  lastSearchQuery?: string;
  lastKeywords?: string[];
  lastCategories?: string[];
  lastLocation?: string;
  lastAtmosphere?: string[];
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
 * 후속 질문 패턴 감지
 */
const isFollowUpQuery = (query: string): boolean => {
  const followUpPatterns = [
    /^더\s/, /^다른\s/, /^또\s/, /없을까/, /있을까/, /어때\??$/, /은\??$/, /는\??$/,
    /말고/, /대신/, /비슷한/, /가까운/, /저렴한/, /비싼/
  ];
  return followUpPatterns.some(pattern => pattern.test(query));
};

/**
 * 후속 질문에서 의미 있는 조건 추출
 */
const extractConditionFromFollowUp = (query: string): { condition: string; type: string } | null => {
  const conditionPatterns: [RegExp, string, string][] = [
    [/더\s*(조용한|시끄러운|넓은|좁은|깨끗한)/, '$1', 'atmosphere'],
    [/더\s*(저렴한|싼|비싼|고급)/, '$1', 'price'],
    [/(주차|와이파이|WiFi|흡연|금연|예약)/, '$1', 'feature'],
    [/(혼밥|데이트|회식|가족|친구|연인)/, '$1', 'situation'],
    [/다른\s*(지역|동네|곳)/, '다른 지역', 'location'],
  ];

  for (const [pattern, replacement, type] of conditionPatterns) {
    const match = query.match(pattern);
    if (match) {
      return { 
        condition: match[1] || replacement.replace('$1', match[1] || ''), 
        type 
      };
    }
  }
  return null;
};

/**
 * 프론트엔드 폴백 해석 (AI 실패 시)
 */
const fallbackInterpret = (query: string, context?: SearchContext): AISearchResponse => {
  const keywords: string[] = [];
  const categories: string[] = [];
  let location: string | undefined;
  const atmosphere: string[] = [];

  // 후속 질문인 경우 이전 컨텍스트 활용
  if (isFollowUpQuery(query) && context?.lastSearchQuery) {
    // 이전 검색어의 키워드와 카테고리 유지
    keywords.push(...(context.lastKeywords || []));
    categories.push(...(context.lastCategories || []));
    location = context.lastLocation;

    // 새 조건 추출 및 추가
    const newCondition = extractConditionFromFollowUp(query);
    if (newCondition) {
      if (newCondition.type === 'atmosphere') {
        atmosphere.push(newCondition.condition);
        keywords.push(newCondition.condition);
      } else if (newCondition.type === 'feature') {
        keywords.push(newCondition.condition);
      } else if (newCondition.type === 'situation') {
        keywords.push(newCondition.condition);
      }
    }

    const searchQuery = [...new Set(keywords)].join(' ');
    return {
      response: `${newCondition?.condition || '조건'}을 추가해서 다시 찾아볼게요! 🔍`,
      searchQuery: searchQuery || context.lastSearchQuery,
      keywords: [...new Set(keywords)],
      categories: [...new Set(categories)],
      location,
      atmosphere,
      followUpQuestions: generateFollowUpQuestions(categories[0], location, atmosphere),
    };
  }

  // 일반 질문 처리
  // 카테고리 매칭
  const categoryMap: Record<string, string[]> = {
    '카페': ['카페', '커피', '디저트', '브런치', '베이커리'],
    '음식점': ['맛집', '음식점', '식당', '밥', '레스토랑', '한식', '중식', '일식', '양식'],
    '술집': ['술집', '바', '호프', '이자카야', '포차'],
    '쇼핑': ['쇼핑', '마트', '백화점'],
  };
  
  for (const [category, words] of Object.entries(categoryMap)) {
    if (words.some(word => query.includes(word))) {
      categories.push(category);
    }
  }

  // 분위기 키워드
  const atmosphereKeywords = ['조용한', '시끄러운', '분위기', '로맨틱', '아늑한', '넓은', '모던'];
  atmosphereKeywords.forEach(kw => {
    if (query.includes(kw)) atmosphere.push(kw);
  });

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

  // 키워드 추출 (불용어 제거)
  const stopWords = ['좋은', '있는', '추천', '해주세요', '알려', '찾아', '근처', '주변', '되는', '곳으로', '곳은', '더', '다른'];
  const words = query.split(/\s+/).filter(w => 
    w.length > 1 && !stopWords.some(sw => w.includes(sw))
  );
  keywords.push(...words.slice(0, 5));

  // 분위기 키워드도 검색어에 추가
  keywords.push(...atmosphere);

  const uniqueKeywords = [...new Set(keywords)];
  
  return {
    response: categories.length > 0 
      ? `${categories.join(', ')}을(를) 찾아볼게요! 🔍`
      : `"${query}"로 검색해볼게요! 🔍`,
    searchQuery: uniqueKeywords.length > 0 ? uniqueKeywords.join(' ') : query,
    keywords: uniqueKeywords.length > 0 ? uniqueKeywords : [query],
    categories,
    location,
    atmosphere,
    followUpQuestions: generateFollowUpQuestions(categories[0], location, atmosphere),
  };
};

/**
 * 맞춤형 후속 질문 생성 (프론트엔드 폴백용)
 */
const generateFollowUpQuestions = (
  category?: string, 
  location?: string, 
  atmosphere?: string[]
): string[] => {
  const questions: string[] = [];
  const hasAtmosphere = atmosphere && atmosphere.length > 0;

  // 카테고리별 맞춤 질문
  if (category === '카페') {
    questions.push('디저트가 맛있는 곳은?');
    if (!hasAtmosphere) questions.push('더 조용한 곳은?');
    questions.push('주차 되는 곳은?');
    questions.push('24시간 영업하는 곳은?');
  } else if (category === '음식점') {
    questions.push('예약 가능한 곳은?');
    questions.push('더 가성비 좋은 곳은?');
    questions.push('주차 되는 곳은?');
    if (!location) questions.push('강남쪽은 어때?');
  } else if (category === '술집') {
    questions.push('안주가 맛있는 곳은?');
    questions.push('룸 있는 곳은?');
    questions.push('더 조용한 곳은?');
  } else {
    questions.push('주차 되는 곳은?');
    questions.push('평점 높은 곳만 보여줘');
    questions.push('더 가까운 곳은?');
  }

  // 지역 없으면 지역 질문 추가
  if (!location) {
    questions.push('홍대쪽은 어때?');
  }

  return [...new Set(questions)].slice(0, 4);
};

/**
 * AI를 통한 자연어 검색
 */
export const aiSearchAPI = async (query: string, context?: SearchContext): Promise<AISearchResponse> => {
  // 후속 질문 감지
  const isFollowUp = isFollowUpQuery(query);
  
  // 후속 질문이면 이전 컨텍스트와 합쳐서 전달
  let enhancedQuery = query;
  if (isFollowUp && context?.lastSearchQuery) {
    enhancedQuery = `이전 검색: "${context.lastSearchQuery}". 추가 조건: ${query}`;
  }

  try {
    // 토큰 가져오기
    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    const result = await aiClient.post<unknown, InterpretedQuery>('/ai/interpret', { query: enhancedQuery }, { headers });
    
    // 후속 질문이면 이전 컨텍스트와 병합
    let mergedKeywords = result.keywords || [];
    let mergedCategories = result.categories || [];
    let mergedLocation = result.location;
    
    if (isFollowUp && context) {
      mergedKeywords = [...new Set([...(context.lastKeywords || []), ...mergedKeywords])];
      mergedCategories = [...new Set([...(context.lastCategories || []), ...mergedCategories])];
      mergedLocation = mergedLocation || context.lastLocation;
    }

    return {
      response: result.response || `"${query}"를 검색해볼게요! 🔍`,
      searchQuery: result.searchQuery || (mergedKeywords.length > 0 ? mergedKeywords.join(' ') : query),
      keywords: mergedKeywords.length > 0 ? mergedKeywords : [query],
      categories: mergedCategories,
      location: mergedLocation,
      atmosphere: result.atmosphere,
      situation: result.situation,
      followUpQuestions: result.followUpQuestions || [],
    };
  } catch (error) {
    // 개발 환경에서만 로깅
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn('AI 해석 실패, 폴백 사용:', error instanceof Error ? error.message : 'Unknown');
    }
    
    // AI 실패 시 프론트엔드 폴백 해석 사용 (컨텍스트 전달)
    return fallbackInterpret(query, context);
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
