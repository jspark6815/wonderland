import { Injectable } from '@nestjs/common';
import { OllamaService } from './services/ollama.service';
import { RecommendPlaceDto } from './dto/recommend-place.dto';
import { SummarizeReviewsDto } from './dto/summarize-reviews.dto';
import { InterpretQueryDto } from './dto/interpret-query.dto';

@Injectable()
export class AiService {
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
    const prompt = `다음 리뷰들을 간단명료하게 요약해주세요:

${dto.reviews.join('\n\n')}

요약:`;
    
    const response = await this.ollamaService.generate(prompt);
    return response.response;
  }

  /**
   * 자연어 쿼리 해석
   */
  async interpretQuery(dto: InterpretQueryDto): Promise<any> {
    const prompt = `사용자의 검색 의도를 분석하여 구조화된 검색 조건으로 변환해주세요.

사용자 입력: "${dto.query}"

다음 형식으로 JSON을 반환해주세요:
{
  "categories": ["카페", "레스토랑" 등],
  "priceRange": {"min": 0, "max": 50000},
  "keywords": ["조용한", "분위기좋은" 등],
  "location": "지역명",
  "distance": 1000
}

JSON:`;

    const response = await this.ollamaService.generate(prompt);
    try {
      return JSON.parse(response.response);
    } catch {
      return { keywords: [dto.query] };
    }
  }

  /**
   * 장소 비교 분석
   */
  async comparePlaces(places: any[]): Promise<string> {
    const placesInfo = places.map(p => `${p.name}: ${p.description}`).join('\n');
    const prompt = `다음 장소들을 비교 분석해주세요:

${placesInfo}

각 장소의 장단점과 추천 상황을 알려주세요.`;
    
    const response = await this.ollamaService.generate(prompt);
    return response.response;
  }

  private buildRecommendationPrompt(dto: RecommendPlaceDto): string {
    const { preferences, location, budget, occasion } = dto;
    
    return `당신은 장소 추천 전문가입니다.
다음 조건에 맞는 장소를 추천해주세요:

선호도: ${preferences.join(', ')}
위치: ${location || '상관없음'}
예산: ${budget || '상관없음'}
상황: ${occasion || '일반'}

추천 장소와 이유를 설명해주세요.`;
  }
}
