/**
 * AI 쿼리 해석 결과
 */
export interface InterpretedQuery {
  searchQuery: string;
  categories: string[];
  keywords: string[];
  location?: string;
  atmosphere?: string[];
  priceRange?: string;
  situation?: string;
  specialRequests?: string[];
  response: string;
  followUpQuestions?: string[]; // AI가 생성한 맞춤형 후속 질문
}

/**
 * AI 추천 응답 (스트리밍)
 */
export interface AiStreamResponse {
  content?: string;
  error?: string;
}

/**
 * AI 리뷰 요약 요청
 */
export interface SummarizeReviewsRequest {
  reviews: string[];
}

/**
 * AI 장소 추천 요청
 */
export interface RecommendPlaceRequest {
  preferences: string[];
  location?: string;
  budget?: number;
  occasion?: string;
}

