/**
 * 카테고리 관련 유틸리티 함수
 * - 영문 enum → 한글 변환
 * - 카테고리별 이모지
 */

// 카테고리 → 이모지 & 한글 변환 맵
export const CATEGORY_MAP: Record<string, { icon: string; label: string }> = {
  // 영문 enum 값
  CAFE: { icon: '☕', label: '카페' },
  RESTAURANT: { icon: '🍽️', label: '음식점' },
  SHOPPING: { icon: '🛍️', label: '쇼핑' },
  CULTURE: { icon: '🎭', label: '문화/관광' },
  HEALTHCARE: { icon: '🏥', label: '병원/의료' },
  CONVENIENCE: { icon: '🏪', label: '편의점' },
  ACCOMMODATION: { icon: '🏨', label: '숙박' },
  TRANSPORT: { icon: '🚇', label: '교통' },
  ENTERTAINMENT: { icon: '🎮', label: '오락/레저' },
  OTHER: { icon: '📍', label: '기타' },
  
  // 한글 키워드 (네이버 원본 카테고리에서 추출 시 사용)
  '카페': { icon: '☕', label: '카페' },
  '커피': { icon: '☕', label: '카페' },
  '커피전문점': { icon: '☕', label: '카페' },
  '디저트': { icon: '🍰', label: '디저트' },
  '베이커리': { icon: '🥐', label: '베이커리' },
  '브런치': { icon: '🥞', label: '브런치' },
  
  '음식점': { icon: '🍽️', label: '음식점' },
  '한식': { icon: '🍚', label: '한식' },
  '중식': { icon: '🥡', label: '중식' },
  '일식': { icon: '🍣', label: '일식' },
  '양식': { icon: '🍝', label: '양식' },
  '분식': { icon: '🍜', label: '분식' },
  '치킨': { icon: '🍗', label: '치킨' },
  '피자': { icon: '🍕', label: '피자' },
  '햄버거': { icon: '🍔', label: '햄버거' },
  '고깃집': { icon: '🥩', label: '고기' },
  '삼겹살': { icon: '🥓', label: '삼겹살' },
  '횟집': { icon: '🐟', label: '횟집' },
  '초밥': { icon: '🍣', label: '초밥' },
  '라멘': { icon: '🍜', label: '라멘' },
  '뷔페': { icon: '🍴', label: '뷔페' },
  
  '술집': { icon: '🍺', label: '술집' },
  '호프': { icon: '🍺', label: '호프' },
  '이자카야': { icon: '🍶', label: '이자카야' },
  '포차': { icon: '🏮', label: '포차' },
  '바': { icon: '🍸', label: '바' },
  '와인바': { icon: '🍷', label: '와인바' },
  '칵테일': { icon: '🍹', label: '칵테일바' },
  
  '쇼핑': { icon: '🛍️', label: '쇼핑' },
  '마트': { icon: '🛒', label: '마트' },
  '백화점': { icon: '🏬', label: '백화점' },
  '아울렛': { icon: '🏷️', label: '아울렛' },
  '시장': { icon: '🏪', label: '시장' },
  
  '병원': { icon: '🏥', label: '병원' },
  '의원': { icon: '🏥', label: '의원' },
  '약국': { icon: '💊', label: '약국' },
  '치과': { icon: '🦷', label: '치과' },
  '한의원': { icon: '🌿', label: '한의원' },
  
  '편의점': { icon: '🏪', label: '편의점' },
  
  '숙박': { icon: '🏨', label: '숙박' },
  '호텔': { icon: '🏨', label: '호텔' },
  '모텔': { icon: '🏩', label: '모텔' },
  '펜션': { icon: '🏡', label: '펜션' },
  '게스트하우스': { icon: '🛏️', label: '게스트하우스' },
  '리조트': { icon: '🏖️', label: '리조트' },
  
  '노래방': { icon: '🎤', label: '노래방' },
  'PC방': { icon: '🖥️', label: 'PC방' },
  '당구': { icon: '🎱', label: '당구장' },
  '볼링': { icon: '🎳', label: '볼링장' },
  '헬스': { icon: '💪', label: '헬스장' },
  '피트니스': { icon: '🏋️', label: '피트니스' },
  '수영': { icon: '🏊', label: '수영장' },
  '골프': { icon: '⛳', label: '골프' },
  '스파': { icon: '♨️', label: '스파' },
  '사우나': { icon: '🧖', label: '사우나' },
  '찜질방': { icon: '🧖', label: '찜질방' },
  '마사지': { icon: '💆', label: '마사지' },
  
  '공원': { icon: '🌳', label: '공원' },
  '박물관': { icon: '🏛️', label: '박물관' },
  '미술관': { icon: '🖼️', label: '미술관' },
  '극장': { icon: '🎬', label: '극장' },
  '영화관': { icon: '🎬', label: '영화관' },
  '전시': { icon: '🎨', label: '전시관' },
  '관광': { icon: '🗺️', label: '관광명소' },
  
  '지하철': { icon: '🚇', label: '지하철역' },
  '버스': { icon: '🚌', label: '버스정류장' },
  '주차장': { icon: '🅿️', label: '주차장' },
  '주유소': { icon: '⛽', label: '주유소' },
};

/**
 * 카테고리별 아이콘 가져오기
 */
export const getCategoryIcon = (category?: string): string => {
  if (!category) return '📍';
  
  const cat = category.toUpperCase();
  
  // 영문 enum 매칭
  if (CATEGORY_MAP[cat]) {
    return CATEGORY_MAP[cat].icon;
  }
  
  // 한글 키워드 매칭
  for (const [key, value] of Object.entries(CATEGORY_MAP)) {
    if (category.includes(key)) {
      return value.icon;
    }
  }
  
  return '📍';
};

/**
 * 카테고리 한글 변환
 * - 영문 enum(CAFE, RESTAURANT) → 한글(카페, 음식점)
 * - 네이버 원본("카페,디저트>베이커리") → 마지막 부분 추출
 */
export const formatCategory = (category?: string): string => {
  if (!category) return '';
  
  // 1. 영문 enum인 경우 바로 변환
  const upperCat = category.toUpperCase();
  if (CATEGORY_MAP[upperCat]) {
    return CATEGORY_MAP[upperCat].label;
  }
  
  // 2. 네이버 원본 카테고리("카페,디저트>베이커리") 처리
  // ">" 로 분리하여 가장 구체적인 카테고리 추출
  const parts = category.split('>');
  const lastPart = parts[parts.length - 1]?.trim() || '';
  
  // 마지막 부분에서 쉼표로 분리하여 첫 번째 항목 사용
  const subParts = lastPart.split(',');
  const mainCategory = subParts[0]?.trim() || lastPart;
  
  // 한글 키워드 매칭
  if (CATEGORY_MAP[mainCategory]) {
    return CATEGORY_MAP[mainCategory].label;
  }
  
  // 3. 매칭 실패 시 원본의 마지막 부분 반환
  return mainCategory || category;
};

/**
 * 카테고리 정보 가져오기 (아이콘 + 라벨)
 */
export const getCategoryInfo = (category?: string): { icon: string; label: string } => {
  return {
    icon: getCategoryIcon(category),
    label: formatCategory(category),
  };
};

