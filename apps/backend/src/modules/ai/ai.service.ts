import { Injectable, Logger } from '@nestjs/common';
import { OllamaService } from './services/ollama.service';
import { RecommendPlaceDto } from './dto/recommend-place.dto';
import { SummarizeReviewsDto } from './dto/summarize-reviews.dto';
import { InterpretQueryDto } from './dto/interpret-query.dto';

// JSON 스키마 정의 (고정)
const JSON_SCHEMA = {
  intent:
    'string (AI 응답 의도: "SUGGEST_QUERY" | "REFINE_CONTEXT" | "NEED_MORE_INFO")',
  searchQuery: 'string (검색 키워드, 예: "강남 조용한 카페")',
  suggestedQueries:
    'string[] (사용자가 바로 검색에 사용할 수 있는 짧은 검색어 후보 1~3개. 대화문장 금지)',
  categories: 'string[] (카테고리 목록: 카페, 음식점, 술집, 쇼핑, 병원, 숙소, 관광지 중 선택)',
  keywords: 'string[] (검색 키워드 3-5개)',
  location: 'string | null (지역명, 예: "강남역", "홍대", null)',
  atmosphere: 'string[] (분위기: 조용한, 활기찬, 로맨틱, 모던, 아늑한 중 선택)',
  priceRange: 'string | null (가격대: 저렴, 보통, 고급 중 선택)',
  situation: 'string | null (상황: 데이트, 회식, 혼밥, 작업, 가족모임 중 선택)',
  specialRequests: 'string[] (특별 요청: 주차, 와이파이, 콘센트, 애견동반, 단체석 등)',
  response: 'string (사용자에게 보여줄 친근한 응답, 이모지 포함)',
  followUpQuestions: 'string[] (3개의 맞춤형 후속 질문, 현재 검색 맥락에 맞게 생성)',
};

// 시스템 프롬프트 정의
const SYSTEM_PROMPTS = {
  PLACE_ASSISTANT: `당신은 한국의 장소 추천 전문가 "원더"입니다.
당신의 역할:
- 사용자의 자연어 질문을 이해하고 최적의 장소를 추천합니다
- 한국 지역의 특성, 트렌드, 숨은 명소를 잘 알고 있습니다
- 분위기, 상황, 감정에 맞는 장소를 제안합니다
- 친근하고 따뜻한 말투로 대화합니다

응답 원칙:
- 구체적이고 실용적인 정보를 제공합니다
- 사용자의 상황을 이해하고 공감합니다
- 다양한 선택지를 제시합니다`,

  QUERY_INTERPRETER: `당신은 장소 검색 쿼리 분석 전문가입니다.
사용자의 자연어 입력을 분석하여 검색에 필요한 **구조화된 JSON**을 반환합니다.

## 필수 스키마 (이 형식을 정확히 따르세요):
${JSON.stringify(JSON_SCHEMA, null, 2)}

## intent 값 정의 (정확히 이 중 하나):
- SUGGEST_QUERY: 사용자가 말한 문장을 그대로 검색하지 말고, 짧고 검색용으로 정제된 검색어 후보를 제시해야 함
- REFINE_CONTEXT: 이전 검색 맥락(추가 조건)이 들어온 경우. 검색어 후보를 '조건 반영' 형태로 제시해야 함
- NEED_MORE_INFO: 검색을 바로 하기 어렵다면(지역/카테고리 불명확 등) 질문으로 추가 정보를 얻어야 함

## suggestedQueries 생성 규칙:
- 사용자가 바로 검색에 넣을 수 있는 '짧은' 검색어 1~3개
- 반드시 한국어 중심
- 사용자 발화의 조사/요청문(예: "~찾고 싶어", "~추천해줘")는 제거
- 대화문장 금지 (예: "숭실대역 카페 찾고 싶어." 금지)
- 예: "숭실대역 카페", "숭실대역 조용한 카페", "숭실대역 디저트 카페"

## 카테고리 값 (정확히 이 중에서 선택):
- 카페, 음식점, 술집, 쇼핑, 병원, 숙소, 관광지, 편의점, 문화시설

## 분위기 값 (정확히 이 중에서 선택):
- 조용한, 활기찬, 로맨틱, 모던, 아늑한, 넓은, 힙한, 고급스러운

## 가격대 값 (정확히 이 중에서 선택):
- 저렴, 보통, 고급

## 상황 값 (정확히 이 중에서 선택):
- 데이트, 회식, 혼밥, 작업, 가족모임, 친구모임, 비즈니스

## followUpQuestions 생성 규칙:
- 현재 검색 맥락에 맞는 3개의 질문 생성
- 예: 카페 검색 시 → ["주차 되는 곳은?", "디저트가 맛있는 곳은?", "더 조용한 곳은?"]
- 예: 음식점 검색 시 → ["예약이 가능한 곳은?", "단체석 있는 곳은?", "더 가성비 좋은 곳은?"]

반드시 유효한 JSON만 출력하세요. 다른 텍스트는 포함하지 마세요.`,
};

export type AiQueryIntent = 'SUGGEST_QUERY' | 'REFINE_CONTEXT' | 'NEED_MORE_INFO';

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
  response: string;
  followUpQuestions: string[]; // 맞춤형 후속 질문 (필수)
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(private readonly ollamaService: OllamaService) {}

  /**
   * 사용자 선호도 기반 장소 추천
   */
  async recommendPlaces(dto: RecommendPlaceDto): Promise<any> {
    const prompt = this.buildRecommendationPrompt(dto);
    return this.ollamaService.generate(prompt);
  }

  /**
   * 스트리밍 방식으로 장소 추천
   */
  async *recommendPlacesStream(dto: RecommendPlaceDto): AsyncGenerator<string> {
    const prompt = this.buildRecommendationPrompt(dto);
    yield* this.ollamaService.generateStream(prompt);
  }

  /**
   * 자연어 쿼리 해석 - 스트리밍(SSE)용
   * - Ollama 스트림을 받아 JSON이 완성되는 순간 필드를 분리해서 반환
   * - 프론트는 이 이벤트들을 받아 UI를 단계적으로 구성할 수 있음
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

    // interpretQuery와 동일 프롬프트 사용
    const prompt = `${SYSTEM_PROMPTS.QUERY_INTERPRETER}

## 사용자 입력
"${dto.query}"

## 지금 분석할 입력에 대한 JSON 출력:`;

    let buffer = '';
    let emitted = false;

    try {
      for await (const chunk of this.ollamaService.generateStream(prompt, { forceJson: true })) {
        buffer += chunk;
        // 디버깅/진행 표시용 (너무 길면 프론트에서 무시 가능)
        yield { event: 'chunk', data: { text: chunk } };

        if (emitted) continue;
        yield { event: 'status', data: { stage: 'parsing' } };

        // 코드펜스/잡텍스트 제거 + JSON 후보 추출
        let jsonText = buffer.trim();
        jsonText = jsonText.replace(/```json\\n?/g, '').replace(/```\\n?/g, '').trim();
        const startIdx = jsonText.indexOf('{');
        const endIdx = jsonText.lastIndexOf('}');
        if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) continue;

        const candidate = jsonText.slice(startIdx, endIdx + 1);
        try {
          const parsed = JSON.parse(candidate);

          const result: InterpretedQuery = {
            intent: this.normalizeIntent(parsed.intent),
            searchQuery: parsed.searchQuery || dto.query,
            suggestedQueries: this.normalizeSuggestedQueries(parsed.suggestedQueries, parsed.searchQuery || dto.query),
            categories: this.normalizeCategories(parsed.categories || []),
            keywords: parsed.keywords?.length > 0 ? parsed.keywords : [dto.query],
            location: parsed.location || undefined,
            atmosphere: parsed.atmosphere || [],
            priceRange: this.normalizePriceRange(parsed.priceRange),
            situation: parsed.situation || undefined,
            specialRequests: parsed.specialRequests || [],
            response: parsed.response || this.generateDefaultResponse(dto.query, parsed),
            followUpQuestions: parsed.followUpQuestions?.length > 0
              ? parsed.followUpQuestions.slice(0, 4)
              : this.generateFollowUpQuestions(parsed),
          };

          emitted = true;

          // 이벤트 분리 송출
          yield { event: 'intent', data: { intent: result.intent } };
          yield { event: 'suggestedQueries', data: { suggestedQueries: result.suggestedQueries } };
          yield { event: 'followUpQuestions', data: { followUpQuestions: result.followUpQuestions } };
          yield { event: 'interpretation', data: result };
          yield { event: 'status', data: { stage: 'done' } };
          return;
        } catch {
          // 아직 JSON이 완성되지 않았을 수 있음 → 계속 버퍼링
        }
      }

      // 스트림이 끝났는데 파싱 실패
      yield { event: 'error', data: { message: 'AI 응답(JSON) 파싱에 실패했습니다.' } };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'AI 스트리밍 해석에 실패했습니다.';
      yield { event: 'error', data: { message } };
    }
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
    
    const response = await this.ollamaService.generate(prompt);
    return response.response;
  }

  /**
   * 자연어 쿼리 해석 (고도화)
   */
  async interpretQuery(dto: InterpretQueryDto): Promise<InterpretedQuery> {
    this.logger.debug(`Interpreting query: ${dto.query}`);
    
    const prompt = `${SYSTEM_PROMPTS.QUERY_INTERPRETER}

## 사용자 입력
"${dto.query}"

## 예시 1
입력: "강남역 근처 조용히 작업하기 좋은 카페"
출력:
{
  "intent": "SUGGEST_QUERY",
  "searchQuery": "강남역 조용한 작업 카페",
  "suggestedQueries": ["강남역 조용한 작업 카페", "강남역 카페 작업", "강남역 콘센트 카페"],
  "categories": ["카페"],
  "keywords": ["강남역", "조용한", "작업", "카페", "노트북"],
  "location": "강남역",
  "atmosphere": ["조용한"],
  "priceRange": "보통",
  "situation": "작업",
  "specialRequests": ["콘센트", "와이파이"],
  "response": "강남역 근처 조용한 작업 카페를 찾아볼게요! ☕",
  "followUpQuestions": ["콘센트 있는 곳만 보여줘", "주차 되는 곳은?", "24시간 영업하는 곳은?"]
}

## 예시 2
입력: "오늘 저녁 데이트하기 좋은 분위기 있는 레스토랑"
출력:
{
  "intent": "SUGGEST_QUERY",
  "searchQuery": "데이트 분위기 레스토랑",
  "suggestedQueries": ["데이트 분위기 레스토랑", "저녁 데이트 레스토랑", "로맨틱 레스토랑"],
  "categories": ["음식점"],
  "keywords": ["데이트", "분위기", "로맨틱", "저녁", "레스토랑"],
  "location": null,
  "atmosphere": ["로맨틱"],
  "priceRange": "고급",
  "situation": "데이트",
  "specialRequests": [],
  "response": "분위기 좋은 데이트 레스토랑을 찾아드릴게요! 🍷",
  "followUpQuestions": ["강남쪽은 어때?", "예약 가능한 곳은?", "더 저렴한 곳은?"]
}

## 지금 분석할 입력에 대한 JSON 출력:`;

    try {
      const response = await this.ollamaService.generate(prompt);
      const responseText = response.response || '';
      
      this.logger.debug(`AI response: ${responseText.substring(0, 300)}...`);
      
      // JSON 추출
      let jsonText = responseText.trim();
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonText = jsonMatch[0];
      }
      
      const parsed = JSON.parse(jsonText);
      
      // 필수 필드 보완
      const result: InterpretedQuery = {
        intent: this.normalizeIntent(parsed.intent),
        searchQuery: parsed.searchQuery || dto.query,
        suggestedQueries: this.normalizeSuggestedQueries(parsed.suggestedQueries, parsed.searchQuery || dto.query),
        categories: this.normalizeCategories(parsed.categories || []),
        keywords: parsed.keywords?.length > 0 ? parsed.keywords : [dto.query],
        location: parsed.location || undefined,
        atmosphere: parsed.atmosphere || [],
        priceRange: this.normalizePriceRange(parsed.priceRange),
        situation: parsed.situation || undefined,
        specialRequests: parsed.specialRequests || [],
        response: parsed.response || this.generateDefaultResponse(dto.query, parsed),
        followUpQuestions: parsed.followUpQuestions?.length > 0 
          ? parsed.followUpQuestions.slice(0, 4) 
          : this.generateFollowUpQuestions(parsed),
      };
      
      this.logger.debug(`Interpreted result:`, result);
      return result;
      
    } catch (error: any) {
      this.logger.warn(`Query interpretation failed: ${error.message}`);
      
      // 폴백: 기본 해석 수행
      return this.fallbackInterpretation(dto.query);
    }
  }

  /**
   * 장소 비교 분석
   */
  async comparePlaces(places: any[]): Promise<string> {
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
    
    const response = await this.ollamaService.generate(prompt);
    return response.response;
  }

  /**
   * 모델 상태 확인
   */
  async checkModelStatus(): Promise<boolean> {
    return this.ollamaService.checkModelStatus();
  }

  /**
   * 추천 프롬프트 빌드
   */
  private buildRecommendationPrompt(dto: RecommendPlaceDto): string {
    const { preferences, location, budget, occasion } = dto;
    
    return `${SYSTEM_PROMPTS.PLACE_ASSISTANT}

사용자가 장소 추천을 요청했습니다.

조건:
- 선호: ${preferences.join(', ')}
- 위치: ${location || '특별히 없음'}
- 예산: ${budget || '상관없음'}
- 상황: ${occasion || '일반'}

추천 형식:
1. 추천 이유 (1-2문장)
2. 추천 장소 3곳 (각각 이름, 특징, 추천 포인트)
3. 방문 팁

친근하고 도움이 되는 톤으로 답변해주세요.`;
  }

  /**
   * 기본 응답 생성
   */
  private generateDefaultResponse(query: string, parsed: any): string {
    const location = parsed.location ? `${parsed.location}에서 ` : '';
    const category = parsed.categories?.[0] || '장소';
    const atmosphere = parsed.atmosphere?.[0] ? `${parsed.atmosphere[0]} ` : '';
    
    return `${location}${atmosphere}${category}를 찾아볼게요! 🔍`;
  }

  /**
   * 폴백 해석 (AI 실패 시)
   */
  private fallbackInterpretation(query: string): InterpretedQuery {
    // 간단한 키워드 추출
    const keywords: string[] = [];
    const categories: string[] = [];
    const atmosphere: string[] = [];
    let location: string | undefined;
    let situation: string | undefined;
    
    // 카테고리 키워드 매칭
    const categoryMap: Record<string, string[]> = {
      '카페': ['카페', '커피', '디저트', '브런치', '베이커리'],
      '음식점': ['레스토랑', '맛집', '음식점', '식당', '밥', '한식', '중식', '일식', '양식'],
      '술집': ['술집', '바', '호프', '이자카야', '포차'],
      '쇼핑': ['쇼핑', '백화점', '마트', '옷가게'],
    };
    
    for (const [category, words] of Object.entries(categoryMap)) {
      if (words.some(word => query.includes(word))) {
        categories.push(category);
      }
    }

    // 분위기 키워드
    const atmosphereMap: Record<string, string[]> = {
      '조용한': ['조용', '한적', '고요'],
      '활기찬': ['활기', '북적', '시끌'],
      '로맨틱': ['로맨틱', '분위기', '감성'],
      '아늑한': ['아늑', '따뜻', '포근'],
    };
    
    for (const [atm, words] of Object.entries(atmosphereMap)) {
      if (words.some(word => query.includes(word))) {
        atmosphere.push(atm);
      }
    }

    // 상황 키워드
    const situationMap: Record<string, string[]> = {
      '데이트': ['데이트', '연인', '커플'],
      '회식': ['회식', '단체', '모임'],
      '혼밥': ['혼밥', '혼자', '1인'],
      '작업': ['작업', '공부', '노트북'],
    };
    
    for (const [sit, words] of Object.entries(situationMap)) {
      if (words.some(word => query.includes(word))) {
        situation = sit;
        break;
      }
    }
    
    // 지역 추출 (간단한 패턴)
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
    const stopWords = ['좋은', '있는', '추천', '해주세요', '알려', '찾아', '근처', '주변', '더', '다른'];
    const words = query.split(/\s+/).filter(w => 
      w.length > 1 && !stopWords.some(sw => w.includes(sw))
    );
    keywords.push(...words.slice(0, 5));

    const result = {
      intent: 'SUGGEST_QUERY' as const,
      searchQuery: keywords.length > 0 ? keywords.join(' ') : query,
      suggestedQueries: [keywords.length > 0 ? keywords.join(' ') : query],
      categories,
      keywords: keywords.length > 0 ? keywords : [query],
      location,
      atmosphere,
      situation,
      specialRequests: [],
      response: categories.length > 0 
        ? `${categories[0]}을(를) 찾아볼게요! 🔍`
        : `"${query}"로 검색해볼게요! 🔍`,
      followUpQuestions: this.generateFollowUpQuestions({ categories, atmosphere, situation, location }),
    };
    
    return result;
  }

  /**
   * 카테고리 정규화
   */
  private normalizeCategories(categories: string[]): string[] {
    const validCategories = ['카페', '음식점', '술집', '쇼핑', '병원', '숙소', '관광지', '편의점', '문화시설'];
    return categories.filter(c => validCategories.includes(c) || validCategories.some(vc => c.includes(vc)));
  }

  /**
   * 가격대 정규화
   */
  private normalizePriceRange(priceRange?: string): string | undefined {
    if (!priceRange) return undefined;
    const validRanges = ['저렴', '보통', '고급'];
    const lower = priceRange.toLowerCase();
    if (lower.includes('저렴') || lower.includes('싼')) return '저렴';
    if (lower.includes('고급') || lower.includes('비싼')) return '고급';
    if (validRanges.includes(priceRange)) return priceRange;
    return '보통';
  }

  /**
   * 맞춤형 후속 질문 생성
   */
  private generateFollowUpQuestions(parsed: Partial<InterpretedQuery>): string[] {
    const questions: string[] = [];
    const category = parsed.categories?.[0];
    const hasLocation = !!parsed.location;
    const hasAtmosphere = (parsed.atmosphere?.length || 0) > 0;
    const situation = parsed.situation;

    // 카테고리별 맞춤 질문
    if (category === '카페') {
      questions.push('디저트가 맛있는 곳은?');
      if (!hasAtmosphere) questions.push('더 조용한 곳은?');
      questions.push('콘센트 있는 곳만 보여줘');
      questions.push('주차 되는 곳은?');
    } else if (category === '음식점') {
      questions.push('예약 가능한 곳은?');
      questions.push('단체석 있는 곳은?');
      questions.push('더 가성비 좋은 곳은?');
      if (!hasLocation) questions.push('강남쪽은 어때?');
    } else if (category === '술집') {
      questions.push('안주가 맛있는 곳은?');
      questions.push('조용히 얘기할 수 있는 곳은?');
      questions.push('룸 있는 곳은?');
    } else {
      // 기본 질문
      questions.push('주차 되는 곳은?');
      questions.push('더 가까운 곳은?');
      questions.push('평점 높은 곳은?');
    }

    // 상황별 추가 질문
    if (situation === '데이트') {
      questions.push('더 로맨틱한 곳은?');
    } else if (situation === '회식') {
      questions.push('더 넓은 곳은?');
    } else if (situation === '작업') {
      questions.push('24시간 영업하는 곳은?');
    }

    // 지역 관련 질문
    if (!hasLocation) {
      questions.push('홍대쪽은 어때?');
    }

    // 중복 제거 후 4개까지 반환
    return [...new Set(questions)].slice(0, 4);
  }

  private normalizeIntent(intent?: unknown): AiQueryIntent {
    if (typeof intent !== 'string') return 'SUGGEST_QUERY';
    if (intent === 'SUGGEST_QUERY' || intent === 'REFINE_CONTEXT' || intent === 'NEED_MORE_INFO') {
      return intent;
    }
    return 'SUGGEST_QUERY';
  }

  private normalizeSuggestedQueries(suggested: unknown, fallbackQuery: string): string[] {
    if (!Array.isArray(suggested)) return [fallbackQuery];
    const cleaned = suggested
      .filter((q) => typeof q === 'string')
      .map((q) => q.trim())
      .filter((q) => q.length > 0)
      // 과도하게 긴 문장 제거 (검색어 후보는 짧게)
      .filter((q) => q.length <= 50);

    return cleaned.length > 0 ? cleaned.slice(0, 3) : [fallbackQuery];
  }
}
