import { Injectable, Inject, Logger, forwardRef } from '@nestjs/common';
import { RecommendPlaceDto } from './dto/recommend-place.dto';
import { SummarizeReviewsDto } from './dto/summarize-reviews.dto';
import { InterpretQueryDto, SearchContext } from './dto/interpret-query.dto';
import { LLM_CLIENT, type LlmClient, type LlmGenerateResult } from './services/llm-client';
import { PlacesService } from '../places/places.service';

// JSON 스키마 정의 (고정)
const JSON_SCHEMA = {
  intent:
    'string (AI 응답 의도: "SEARCH_IMMEDIATELY" | "NEED_MORE_INFO" | "RECOMMEND_THEMES")',
  searchQuery: 'string (검색 키워드, 예: "강남 조용한 카페")',
  suggestedQueries:
    'string[] (사용자가 바로 검색에 사용할 수 있는 짧은 검색어 후보 1~3개)',
  categories: 'string[] (카테고리 목록)',
  keywords: 'string[] (검색 키워드 3-5개)',
  location: 'string | null (지역명)',
  atmosphere: 'string[] (분위기)',
  priceRange: 'string | null (가격대)',
  situation: 'string | null (상황)',
  specialRequests: 'string[] (특별 요청)',
  minRating: 'number | null (최소 평점 필터, 0~5 사이. 평점 높은/별점 언급 시 설정)',
  response: 'string (사용자에게 보여줄 친근한 응답)',
  followUpQuestions: 'string[] (후속 질문)',
};

// 시스템 프롬프트 정의
const SYSTEM_PROMPTS = {
  PLACE_ASSISTANT: `당신은 한국의 핫플레이스와 숨은 명소를 꿰뚫고 있는 장소 추천 전문가 "원더"입니다.
당신의 역할:
- 사용자의 취향(분위기, 예산, 상황)에 딱 맞는 **실존하는** 장소만 추천합니다.
- 네이버 지도나 카카오맵에 검색했을 때 나오는 정확한 장소명을 사용합니다.
- 모호하거나 존재하지 않는 장소를 지어내지 않습니다. (할루시네이션 주의)
- 광고성 멘트보다는 솔직하고 담백한 이용자 입장의 추천을 선호합니다.
- 친근하지만 예의 바른 말투를 사용합니다. (존댓말, 이모지 적절히 사용)

응답 원칙:
- 반드시 3곳을 추천하되, 정보가 확실하지 않으면 추천하지 마세요.
- 장소 이름은 정확하게 기재하세요.
- 추천 이유는 구체적이어야 합니다. ("좋아요" 대신 "통유리창으로 보이는 뷰가 일품입니다" 등)`,

  QUERY_INTERPRETER: `당신은 장소 검색 쿼리 분석 전문가입니다.
사용자의 자연어 입력을 분석하여 검색에 필요한 **구조화된 JSON**을 반환합니다.

## 핵심 원칙
1. **사용자가 장소 추천을 요청하면, 반드시 검색 가능한 구체적인 검색어(searchQuery)를 생성하세요.**
2. **이전 대화 컨텍스트가 있으면 반드시 참고하세요.** (후속 질문 처리)
3. **평점/별점 요청이 있으면 minRating 값을 추출하세요.**

## Few-shot 예시 (이 패턴을 따르세요):

### 예시 1: 기본 추천 요청
입력: "데이트 장소 추천해줘"
출력:
{
  "intent": "SEARCH_IMMEDIATELY",
  "searchQuery": "서울 데이트 맛집",
  "suggestedQueries": ["강남 데이트 맛집", "홍대 분위기 좋은 레스토랑"],
  "categories": ["음식점"],
  "keywords": ["데이트", "맛집", "분위기"],
  "location": "서울",
  "atmosphere": ["로맨틱", "분위기좋은"],
  "situation": "데이트",
  "response": "데이트에 딱 맞는 분위기 좋은 곳들을 찾아볼게요! 💕",
  "followUpQuestions": ["어느 지역이 좋으세요?", "예산은 어느 정도로 생각하세요?"]
}

### 예시 2: 평점 필터 요청
입력: "평점 높은 카페 추천해줘"
출력:
{
  "intent": "SEARCH_IMMEDIATELY",
  "searchQuery": "서울 카페",
  "suggestedQueries": ["강남 인기 카페", "성수 평점 좋은 카페"],
  "categories": ["카페"],
  "keywords": ["카페", "평점높은", "인기"],
  "location": "서울",
  "minRating": 4.3,
  "response": "평점 4.3 이상의 인기 카페들을 찾아볼게요! ⭐",
  "followUpQuestions": ["어떤 분위기를 원하세요?", "디저트가 맛있는 곳을 찾으세요?"]
}

### 예시 3: 후속 질문 (컨텍스트 활용)
이전 검색: "강남 맛집" → 결과 5개
입력: "다른 곳은 없어?"
출력:
{
  "intent": "SEARCH_IMMEDIATELY",
  "searchQuery": "강남 맛집",
  "suggestedQueries": ["강남역 맛집", "신논현 맛집", "강남 숨은 맛집"],
  "categories": ["음식점"],
  "keywords": ["강남", "맛집", "새로운"],
  "location": "강남",
  "response": "강남에서 다른 맛집들을 더 찾아볼게요! 🔍",
  "followUpQuestions": ["어떤 음식 종류를 원하세요?", "가격대는 어떻게 되나요?"]
}

### 예시 4: 조건 추가 (컨텍스트 활용)
이전 검색: "홍대 카페"
입력: "주차되는 곳으로"
출력:
{
  "intent": "SEARCH_IMMEDIATELY",
  "searchQuery": "홍대 주차 카페",
  "suggestedQueries": ["홍대입구 주차가능 카페", "연남동 주차 카페"],
  "categories": ["카페"],
  "keywords": ["홍대", "카페", "주차"],
  "location": "홍대",
  "specialRequests": ["주차가능"],
  "response": "홍대 근처 주차 가능한 카페를 찾아볼게요! 🚗",
  "followUpQuestions": ["무료 주차가 필요하세요?", "넓은 주차장이 있는 곳을 원하세요?"]
}

### 예시 5: 평점 수치 명시
입력: "별점 4.5 이상 맛집 찾아줘"
출력:
{
  "intent": "SEARCH_IMMEDIATELY",
  "searchQuery": "서울 맛집",
  "categories": ["음식점"],
  "keywords": ["맛집", "고평점"],
  "location": "서울",
  "minRating": 4.5,
  "response": "별점 4.5 이상의 인증된 맛집들을 찾아볼게요! 🌟",
  "followUpQuestions": ["어느 지역이 좋으세요?", "어떤 음식을 드시고 싶으세요?"]
}

## 필수 스키마:
${JSON.stringify(JSON_SCHEMA, null, 2)}

## intent 값 정의:
- **SEARCH_IMMEDIATELY**: 명확한 검색어가 있거나 추론 가능한 경우 (대부분 여기)
- **NEED_MORE_INFO**: 정말 힌트가 없는 경우만 (예: "추천해줘", "뭐 있어?")
- **RECOMMEND_THEMES**: 테마 기반 추천 (비 오는 날, 힐링 등) - searchQuery 필수

## 평점/별점 처리 규칙 (minRating):
- "평점 높은", "별점 좋은" → minRating: 4.3
- "평점 4.0 이상", "별점 4.2" → 해당 숫자를 minRating으로 설정
- 평점 언급이 없으면 minRating 필드 생략

## 컨텍스트 활용 규칙:
- "다른 곳", "더 없어?", "또 뭐 있어?" → 이전 검색어 기반으로 새 결과 요청
- "거기 말고", "그거 말고" → 이전 결과 제외하고 새 검색
- "주차되는", "조용한" 등 조건만 있으면 → 이전 검색에 조건 추가

## searchQuery 생성 규칙:
- 지역 없으면 "서울" 기본값
- 상황(데이트, 회식) + 카테고리(맛집, 카페) 조합
- 컨텍스트의 lastLocation이 있으면 해당 지역 유지`,
};

export type AiQueryIntent = 'SEARCH_IMMEDIATELY' | 'NEED_MORE_INFO' | 'RECOMMEND_THEMES' | 'SUGGEST_QUERY' | 'REFINE_CONTEXT';

export interface InterpretedQuery {
  intent: AiQueryIntent;
  searchQuery: string;
  suggestedQueries: string[];
  categories: string[];
  keywords: string[];
  location?: string;
  atmosphere?: string[];
  priceRange?: string;
  situation?: string;
  specialRequests?: string[];
  minRating?: number;
  response: string;
  followUpQuestions: string[];
  places?: any[]; // 검색된 장소 데이터
}

export interface AiModelInfo {
  provider: 'ollama' | 'gemini';
  model: string;
}

type PlaceComparisonInput = {
  name: string;
  description?: string;
  category?: string;
  rating?: number;
};

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null;

const getString = (obj: Record<string, unknown>, key: string): string | undefined =>
  typeof obj[key] === 'string' ? (obj[key] as string) : undefined;

const getStringArray = (obj: Record<string, unknown>, key: string): string[] | undefined => {
  const v = obj[key];
  if (!Array.isArray(v)) return undefined;
  const out = v.filter((x) => typeof x === 'string').map((x) => x.trim()).filter((x) => x.length > 0);
  return out.length > 0 ? out : undefined;
};

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    @Inject(LLM_CLIENT) private readonly llm: LlmClient,
    @Inject(forwardRef(() => PlacesService)) private readonly placesService: PlacesService,
  ) {}

  getModelInfo(): AiModelInfo {
    return {
      provider: this.llm.getProviderName(),
      model: this.llm.getModelName(),
    };
  }

  /**
   * 사용자 선호도 기반 장소 추천
   */
  async recommendPlaces(dto: RecommendPlaceDto): Promise<LlmGenerateResult> {
    const prompt = this.buildRecommendationPrompt(dto);
    return this.llm.generate(prompt);
  }

  /**
   * 스트리밍 방식으로 장소 추천
   */
  async *recommendPlacesStream(dto: RecommendPlaceDto): AsyncGenerator<string> {
    const prompt = this.buildRecommendationPrompt(dto);
    yield* this.llm.generateStream(prompt);
  }

  /**
   * 자연어 쿼리 해석 - 스트리밍(SSE)용
   */
  async *interpretQueryStream(
    dto: InterpretQueryDto,
  ): AsyncGenerator<
    | { event: 'status'; data: { stage: 'started' | 'parsing' | 'done' } }
    | { event: 'chunk'; data: { text: string } }
    | { event: 'intent'; data: { intent: AiQueryIntent } }
    | { event: 'suggestedQueries'; data: { suggestedQueries: string[] } }
    | { event: 'followUpQuestions'; data: { followUpQuestions: string[] } }
    | { event: 'interpretation'; data: InterpretedQuery }
    | { event: 'error'; data: { message: string } }
  > {
    yield { event: 'status', data: { stage: 'started' } };

    // 스트리밍 버전도 interpretQuery 결과를 활용하도록 변경
    // (Gemini는 어차피 스트림이 한방에 옴)
    const result = await this.interpretQuery(dto);
    
    yield { event: 'intent', data: { intent: result.intent } };
    yield { event: 'suggestedQueries', data: { suggestedQueries: result.suggestedQueries } };
    yield { event: 'followUpQuestions', data: { followUpQuestions: result.followUpQuestions } };
    yield { event: 'interpretation', data: result };
    yield { event: 'status', data: { stage: 'done' } };
  }

  /**
   * 리뷰 요약
   */
  async summarizeReviews(dto: SummarizeReviewsDto): Promise<string> {
    const prompt = `${SYSTEM_PROMPTS.PLACE_ASSISTANT}

다음 리뷰들을 분석하여 핵심 포인트를 요약해주세요.

리뷰:
${dto.reviews.map((r, i) => `${i + 1}. ${r}`).join('\n')}

요약 형식:
- 전체 평가 (한 줄)
- 장점 (2-3개)
- 단점 (있다면 1-2개)
- 추천 대상

요약:`;
    
    const response = await this.llm.generate(prompt);
    return response.response;
  }

  /**
   * 자연어 쿼리 해석 (고도화 - 시나리오 분기 + 컨텍스트 활용)
   */
  async interpretQuery(dto: InterpretQueryDto): Promise<InterpretedQuery> {
    this.logger.debug(`Interpreting query: ${dto.query}`);
    
    // 컨텍스트 정보 구성
    const contextInfo = this.buildContextPrompt(dto.context);
    
    // 평점 필터 힌트
    const ratingHint = dto.minRating 
      ? `\n## 사용자 요청 평점 필터: ${dto.minRating} 이상`
      : '';
    
    const prompt = `${SYSTEM_PROMPTS.QUERY_INTERPRETER}
${contextInfo}${ratingHint}

## 사용자 입력
"${dto.query}"

## 지금 분석할 입력에 대한 JSON 출력:`;

    try {
      const response = await this.llm.generate(prompt, { forceJson: true });
      const responseText = response.response || '';
      
      this.logger.debug(`AI response: ${responseText.substring(0, 300)}...`);
      
      let jsonText = responseText.trim();
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonText = jsonMatch[0];
      }
      
      const raw: unknown = JSON.parse(jsonText);
      const parsed = isRecord(raw) ? raw : {};
      
      const intent = this.normalizeIntent(getString(parsed, 'intent'));
      const rawSearchQuery = getString(parsed, 'searchQuery') || dto.query;
      const searchQuery = this.sanitizeSearchQuery(dto.query, rawSearchQuery, intent);
      const minRating = this.detectMinRating(dto.query);
      
      const result: InterpretedQuery = {
        intent,
        searchQuery,
        suggestedQueries: this.normalizeSuggestedQueries(
          parsed.suggestedQueries,
          searchQuery,
        ),
        categories: this.normalizeCategories(getStringArray(parsed, 'categories') || []),
        keywords: getStringArray(parsed, 'keywords') || [dto.query],
        location: getString(parsed, 'location') || undefined,
        atmosphere: getStringArray(parsed, 'atmosphere') || [],
        priceRange: this.normalizePriceRange(getString(parsed, 'priceRange')),
        situation: getString(parsed, 'situation') || undefined,
        specialRequests: getStringArray(parsed, 'specialRequests') || [],
        response: getString(parsed, 'response') || this.generateDefaultResponse(dto.query, parsed),
        followUpQuestions:
          getStringArray(parsed, 'followUpQuestions')?.slice(0, 4) ||
          this.generateFollowUpQuestions(parsed),
        places: [], // 초기값
        minRating,
      };

      // 핵심: 모든 intent에서 searchQuery가 있으면 검색 시도 (사용자가 모르게 백그라운드에서 실행)
      const shouldSearch = searchQuery && searchQuery.length > 1;
      
      if (shouldSearch) {
        this.logger.debug(`Executing search for: ${searchQuery} (intent: ${intent})`);
        try {
          const places = await this.placesService.searchPlaces({
            query: searchQuery,
            limit: 5,
            useExternal: true, // 외부 API (네이버) 사용 허용
            minRating,
          });
          
          result.places = places;
          
          if (places.length > 0) {
            // 결과가 있으면 응답 멘트 보강
            result.response = this.generateSearchResultResponse(intent, searchQuery, places.length);
            // 검색 성공 시 intent를 SEARCH_IMMEDIATELY로 변경 (프론트에서 카드 표시)
            result.intent = 'SEARCH_IMMEDIATELY';
          } else {
            // 검색 결과 없음 - 다른 검색어 제안
            result.response = `"${searchQuery}"로 찾아봤는데 결과가 없네요. 다른 키워드로 시도해볼까요? 🤔`;
            result.suggestedQueries = this.generateAlternativeQueries(searchQuery);
          }
        } catch (searchError) {
          this.logger.warn(`Search failed for "${searchQuery}": ${searchError}`);
          // 검색 실패해도 AI 응답은 그대로 전달
        }
      }

      this.logger.debug(`Interpreted result: intent=${result.intent}, places=${result.places?.length}, searchQuery=${searchQuery}`);
      return result;
      
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.warn(`Query interpretation failed: ${err.message}`);
      return await this.fallbackInterpretation(dto.query);
    }
  }

  async comparePlaces(places: PlaceComparisonInput[]): Promise<string> {
    const placesInfo = places.map((p, i) => 
      `${i + 1}. ${p.name}\n   - 카테고리: ${p.category || '정보없음'}\n   - 설명: ${p.description || '정보없음'}\n   - 평점: ${p.rating || '정보없음'}`
    ).join('\n\n');
    
    const prompt = `${SYSTEM_PROMPTS.PLACE_ASSISTANT}

다음 장소들을 비교 분석해주세요:

${placesInfo}

분석 형식:
1. 각 장소 한줄 평가
2. 장단점 비교표
3. 상황별 추천 (데이트/모임/혼자 등)
4. 최종 추천

분석:`;
    
    const response = await this.llm.generate(prompt);
    return response.response;
  }

  async checkModelStatus(): Promise<boolean> {
    return this.llm.checkModelStatus();
  }

  private buildRecommendationPrompt(dto: RecommendPlaceDto): string {
    const { preferences, location, budget, occasion } = dto;
    
    return `${SYSTEM_PROMPTS.PLACE_ASSISTANT}

[사용자 요청]
- 지역/위치: ${location || '지역 무관 (서울/수도권 위주로 추천)'}
- 선호 키워드: ${preferences.join(', ')}
- 예산: ${budget ? `인당 약 ${budget.toLocaleString()}원` : '상관없음'}
- 방문 목적/상황: ${occasion || '일상/데이트'}

[지시사항]
위 조건을 만족하는 **최고의 장소 3곳**을 추천해주세요.
반드시 아래 **마크다운(Markdown) 형식**을 정확히 지켜서 답변해주세요.

### 1. [장소명]
- **한줄 평**: 이 장소를 추천하는 핵심 이유
- **특징**: 분위기, 대표 메뉴, 인테리어 등
- **팁**: 웨이팅, 주차, 예약 팁 등 실질적인 정보

### 2. [장소명]
(위와 동일)

### 3. [장소명]
(위와 동일)

(마지막에 방문 시 유의사항이나 총평을 짧게 덧붙여주세요.)`;
  }

  private generateDefaultResponse(query: string, parsed: Record<string, unknown>): string {
    const locationValue = getString(parsed, 'location');
    const location = locationValue ? `${locationValue} 쪽을 ` : '';

    const categories = getStringArray(parsed, 'categories') || [];
    const category = categories[0] || '장소';

    const atmospheres = getStringArray(parsed, 'atmosphere') || [];
    const atmosphere = atmospheres[0] ? `${atmospheres[0]} 분위기의 ` : '';
    
    return `${location}${atmosphere}${category} 정보를 찾아드릴게요! 잠시만 기다려주세요. 🔍`;
  }

  private async fallbackInterpretation(query: string): Promise<InterpretedQuery> {
    // LLM 실패 시에도 즉시 검색 가능한 검색어로 보정
    const safeQuery = this.sanitizeSearchQuery(query, query, 'SEARCH_IMMEDIATELY');
    const minRating = this.detectMinRating(query);

    const result: InterpretedQuery = {
      intent: 'SEARCH_IMMEDIATELY',
      searchQuery: safeQuery,
      suggestedQueries: [safeQuery],
      categories: [],
      keywords: [safeQuery],
      location: undefined,
      atmosphere: [],
      priceRange: undefined,
      situation: undefined,
      specialRequests: [],
      minRating,
      response: `${safeQuery}로 검색해볼게요! 🔍`,
      followUpQuestions: ['주차 가능한 곳은?', '평점 높은 곳만 보여줘'],
      places: [],
    };

    // 바로 실제 검색 시도 (네이버 API 포함) - await로 결과 대기
    try {
      const places = await this.placesService.searchPlaces({
        query: safeQuery,
        limit: 5,
        useExternal: true,
        minRating,
      });
      
      result.places = places;
      if (places.length > 0) {
        result.response = this.generateSearchResultResponse('SEARCH_IMMEDIATELY', safeQuery, places.length);
      } else {
        result.response = `"${safeQuery}"로는 결과가 없어요. 다른 지역이나 키워드로 시도해볼까요?`;
        result.suggestedQueries = this.generateAlternativeQueries(safeQuery);
        result.intent = 'NEED_MORE_INFO';
      }
    } catch (err) {
      this.logger.warn(`Fallback search failed: ${err}`);
    }

    return result;
  }

  private normalizeCategories(categories: string[]): string[] {
    const validCategories = ['카페', '음식점', '술집', '쇼핑', '병원', '숙소', '관광지', '편의점', '문화시설'];
    return categories.filter(c => validCategories.includes(c) || validCategories.some(vc => c.includes(vc)));
  }

  private normalizePriceRange(priceRange?: string): string | undefined {
    if (!priceRange) return undefined;
    const validRanges = ['저렴', '보통', '고급'];
    if (validRanges.includes(priceRange)) return priceRange;
    return '보통';
  }

  private generateFollowUpQuestions(parsed: Partial<InterpretedQuery>): string[] {
    return ['주차 되는 곳은?', '더 가까운 곳은?', '평점 높은 곳만 보여줘'].slice(0, 4);
  }

  private normalizeIntent(intent?: unknown): AiQueryIntent {
    if (typeof intent !== 'string') return 'SUGGEST_QUERY';
    if (['SEARCH_IMMEDIATELY', 'NEED_MORE_INFO', 'RECOMMEND_THEMES', 'SUGGEST_QUERY', 'REFINE_CONTEXT'].includes(intent)) {
      return intent as AiQueryIntent;
    }
    return 'SUGGEST_QUERY';
  }

  private normalizeSuggestedQueries(suggested: unknown, fallbackQuery: string): string[] {
    if (!Array.isArray(suggested)) return [fallbackQuery];
    const cleaned = suggested
      .filter((q) => typeof q === 'string')
      .map((q) => q.trim())
      .filter((q) => q.length > 0)
      .filter((q) => q.length <= 50);

    return cleaned.length > 0 ? cleaned.slice(0, 3) : [fallbackQuery];
  }

  /**
   * LLM이 만들어낸 searchQuery가 모호할 때 보정
   * - 데이트/회식/카페/맛집 등 키워드를 지역과 결합해 검색 가능하게 만듦
   */
  private sanitizeSearchQuery(userInput: string, parsedQuery: string, intent: AiQueryIntent): string {
    const base = (parsedQuery || '').trim() || userInput.trim();
    const lower = base.toLowerCase();

    // 위치 추출 (간단 매칭)
    const locations = ['강남', '홍대', '성수', '잠실', '명동', '이태원', '신촌', '건대', '종로', '서울'];
    const foundLocation = locations.find((loc) => base.includes(loc)) || '서울';

    const build = (keyword: string) => `${foundLocation} ${keyword}`.trim().slice(0, 50);

    if (base.length < 2 || /할$/.test(base) || /키워드/.test(base)) {
      // "데이트할", "키워드" 등 검색 불가한 경우
      if (userInput.includes('데이트')) return build('데이트 맛집');
      if (userInput.includes('회식')) return build('회식 맛집');
      return build('맛집');
    }

    if (base.includes('데이트') || userInput.includes('데이트')) {
      return build('데이트 맛집');
    }
    if (base.includes('회식') || userInput.includes('회식')) {
      return build('회식 맛집');
    }
    if (base.includes('맛집')) {
      return build('맛집');
    }
    if (base.includes('카페')) {
      return build('카페');
    }
    if (base.includes('술집') || base.includes('바') || base.includes('이자카야')) {
      return build('술집');
    }

    // 테마 추천 intent도 기본적으로 검색 가능하도록 보정
    if (intent === 'RECOMMEND_THEMES') {
      return build(base);
    }

    return base.slice(0, 50);
  }

  /**
   * 검색 결과에 맞는 자연스러운 응답 생성
   */
  private generateSearchResultResponse(intent: AiQueryIntent, searchQuery: string, count: number): string {
    const responses: Record<string, string[]> = {
      'SEARCH_IMMEDIATELY': [
        `${searchQuery} 관련 장소 ${count}곳을 찾았어요! 👀`,
        `${searchQuery}에 딱 맞는 곳들이에요! ✨`,
      ],
      'RECOMMEND_THEMES': [
        `이런 분위기는 어떠세요? ${count}곳을 추천해드릴게요! 💫`,
        `취향 저격 장소 ${count}곳을 찾아왔어요! 🎯`,
      ],
      'NEED_MORE_INFO': [
        `일단 ${count}곳을 찾아봤어요! 더 구체적인 조건이 있으면 말씀해주세요 😊`,
      ],
    };
    
    const options = responses[intent] || responses['SEARCH_IMMEDIATELY'];
    return options[Math.floor(Math.random() * options.length)];
  }

  /**
   * 검색 결과가 없을 때 대안 검색어 생성
   */
  private generateAlternativeQueries(originalQuery: string): string[] {
    // 지역명 추출 시도
    const locations = ['강남', '홍대', '성수', '잠실', '명동', '이태원', '신촌'];
    const categories = ['맛집', '카페', '술집', '레스토랑'];
    
    const alternatives: string[] = [];
    
    // 지역이 포함되어 있으면 다른 카테고리로
    const hasLocation = locations.some(loc => originalQuery.includes(loc));
    if (hasLocation) {
      const location = locations.find(loc => originalQuery.includes(loc));
      categories.slice(0, 2).forEach(cat => {
        if (!originalQuery.includes(cat)) {
          alternatives.push(`${location} ${cat}`);
        }
      });
    } else {
      // 지역이 없으면 인기 지역 추천
      alternatives.push('강남 맛집', '홍대 카페', '성수 브런치');
    }
    
    return alternatives.slice(0, 3);
  }

  /**
   * "평점 높은", "별점 4.3" 같은 요청에서 최소 평점을 추출
   */
  private detectMinRating(text: string): number | undefined {
    const normalized = text.replace(/\s+/g, '').toLowerCase();

    // 숫자 평점 명시 (예: 평점4.2, 별점4.5)
    const numMatch = normalized.match(/(?:평점|별점)(\d(?:\.\d)?)/);
    if (numMatch && numMatch[1]) {
      const val = parseFloat(numMatch[1]);
      if (!isNaN(val) && val >= 0 && val <= 5) return val;
    }

    // "평점높은", "별점높은" 등 키워드
    if (normalized.includes('평점높') || normalized.includes('별점높')) {
      return 4.3;
    }

    // "평점만" "좋은곳" 등의 모호한 경우는 기본값 미설정
    return undefined;
  }

  /**
   * 이전 대화 컨텍스트를 프롬프트용 문자열로 변환
   */
  private buildContextPrompt(context?: SearchContext): string {
    if (!context) return '';
    
    const parts: string[] = [];
    
    if (context.lastSearchQuery) {
      parts.push(`- 이전 검색어: "${context.lastSearchQuery}"`);
    }
    if (context.lastLocation) {
      parts.push(`- 이전 검색 지역: ${context.lastLocation}`);
    }
    if (context.lastCategories && context.lastCategories.length > 0) {
      parts.push(`- 이전 검색 카테고리: ${context.lastCategories.join(', ')}`);
    }
    if (context.lastKeywords && context.lastKeywords.length > 0) {
      parts.push(`- 이전 검색 키워드: ${context.lastKeywords.join(', ')}`);
    }
    if (context.lastAtmosphere && context.lastAtmosphere.length > 0) {
      parts.push(`- 이전 검색 분위기: ${context.lastAtmosphere.join(', ')}`);
    }
    if (context.lastResultCount !== undefined) {
      parts.push(`- 이전 검색 결과 수: ${context.lastResultCount}개`);
    }
    
    if (parts.length === 0) return '';
    
    return `

## 이전 대화 컨텍스트 (후속 질문 시 반드시 참고하세요!)
${parts.join('\n')}

※ 사용자가 "다른 곳", "더 없어?", "주차되는 곳으로" 등 후속 질문을 하면,
   위 컨텍스트를 기반으로 검색어를 구성하세요.`;
  }
}
