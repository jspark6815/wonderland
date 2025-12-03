import { Injectable, Logger } from '@nestjs/common';
import { OllamaService } from './services/ollama.service';
import { RecommendPlaceDto } from './dto/recommend-place.dto';
import { SummarizeReviewsDto } from './dto/summarize-reviews.dto';
import { InterpretQueryDto } from './dto/interpret-query.dto';

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
사용자의 자연어 입력을 분석하여 검색에 필요한 구조화된 정보를 추출합니다.

분석 기준:
1. 카테고리: 음식점, 카페, 술집, 편의점, 병원, 약국, 쇼핑, 관광지, 숙소, 문화시설 등
2. 지역: 서울 구/동, 경기도 시/구, 기타 광역시/도 등 구체적 지역
3. 분위기/특성: 조용한, 활기찬, 로맨틱한, 가족친화적, 혼자가기좋은, 데이트, 모임 등
4. 가격대: 저렴한, 가성비, 고급, 특별한날 등
5. 시간/상황: 아침, 점심, 저녁, 브런치, 야식, 24시간 등
6. 특별 요구: 주차가능, 애견동반, 단체석, 개인실, 루프탑 등

반드시 JSON 형식으로만 응답하세요.`,
};

interface InterpretedQuery {
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

사용자 입력: "${dto.query}"

다음 JSON 형식으로 분석 결과를 반환하세요:
{
  "searchQuery": "검색에 사용할 핵심 키워드 (예: '강남 분위기좋은 카페')",
  "categories": ["카테고리1", "카테고리2"],
  "keywords": ["키워드1", "키워드2", "키워드3"],
  "location": "지역명 (있으면)",
  "atmosphere": ["분위기1", "분위기2"],
  "priceRange": "가격대 (저렴/보통/고급)",
  "situation": "상황 (데이트/모임/혼자/가족 등)",
  "specialRequests": ["특별요구1", "특별요구2"],
  "response": "사용자에게 보여줄 친근한 응답 메시지"
}

예시 1:
입력: "강남역 근처 조용히 작업하기 좋은 카페"
출력: {
  "searchQuery": "강남역 작업 카페",
  "categories": ["카페"],
  "keywords": ["작업", "노트북", "조용한", "카페"],
  "location": "강남역",
  "atmosphere": ["조용한", "집중하기좋은"],
  "priceRange": "보통",
  "situation": "작업/공부",
  "specialRequests": ["콘센트", "와이파이"],
  "response": "강남역 근처에서 조용히 작업하기 좋은 카페를 찾아볼게요! ☕ 콘센트와 와이파이가 잘 되는 곳으로 추천해드릴게요."
}

예시 2:
입력: "오늘 저녁 데이트하기 좋은 분위기 있는 레스토랑"
출력: {
  "searchQuery": "데이트 분위기 레스토랑",
  "categories": ["레스토랑", "양식", "이탈리안"],
  "keywords": ["데이트", "분위기", "로맨틱", "저녁"],
  "location": null,
  "atmosphere": ["로맨틱한", "분위기좋은"],
  "priceRange": "고급",
  "situation": "데이트",
  "specialRequests": [],
  "response": "특별한 데이트를 위한 분위기 좋은 레스토랑을 찾아드릴게요! 🍷 어떤 지역이 좋으신가요?"
}

JSON:`;

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
        searchQuery: parsed.searchQuery || dto.query,
        categories: parsed.categories || [],
        keywords: parsed.keywords?.length > 0 ? parsed.keywords : [dto.query],
        location: parsed.location || undefined,
        atmosphere: parsed.atmosphere || [],
        priceRange: parsed.priceRange || undefined,
        situation: parsed.situation || undefined,
        specialRequests: parsed.specialRequests || [],
        response: parsed.response || this.generateDefaultResponse(dto.query, parsed),
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
    let location: string | undefined;
    
    // 카테고리 키워드 매칭
    const categoryMap: Record<string, string[]> = {
      '카페': ['카페', '커피', '디저트', '브런치'],
      '레스토랑': ['레스토랑', '맛집', '음식점', '식당', '밥'],
      '술집': ['술집', '바', '호프', '이자카야', '포차'],
      '쇼핑': ['쇼핑', '백화점', '마트', '옷가게'],
    };
    
    for (const [category, words] of Object.entries(categoryMap)) {
      if (words.some(word => query.includes(word))) {
        categories.push(category);
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
    const stopWords = ['좋은', '있는', '추천', '해주세요', '알려', '찾아', '근처', '주변'];
    const words = query.split(/\s+/).filter(w => 
      w.length > 1 && !stopWords.some(sw => w.includes(sw))
    );
    keywords.push(...words.slice(0, 5));
    
    return {
      searchQuery: query,
      categories,
      keywords: keywords.length > 0 ? keywords : [query],
      location,
      atmosphere: [],
      response: `"${query}"로 검색해볼게요! 🔍`,
    };
  }
}
