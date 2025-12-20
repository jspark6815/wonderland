import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class NaverPlacesService {
  private readonly logger = new Logger(NaverPlacesService.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl = 'https://openapi.naver.com/v1/search';
  
  // Rate Limit 관리
  private lastApiCall = 0;
  private readonly API_CALL_DELAY = 100; // 최소 100ms 간격
  private readonly MAX_RETRIES = 3;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.clientId = this.configService.get<string>('NAVER_CLIENT_ID') || '';
    this.clientSecret = this.configService.get<string>('NAVER_CLIENT_SECRET') || '';
  }

  /**
   * Rate Limit을 고려한 딜레이
   */
  private async rateLimitDelay(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastApiCall;
    if (elapsed < this.API_CALL_DELAY) {
      await this.sleep(this.API_CALL_DELAY - elapsed);
    }
    this.lastApiCall = Date.now();
  }

  /**
   * 재시도 로직이 포함된 API 호출
   */
  private async callApiWithRetry<T>(
    apiCall: () => Promise<T>,
    retries = this.MAX_RETRIES
  ): Promise<T> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        await this.rateLimitDelay();
        return await apiCall();
      } catch (error: any) {
        const status = error?.response?.status;
        
        // 429 (Rate Limit) 또는 503 (Service Unavailable)인 경우 재시도
        if ((status === 429 || status === 503) && attempt < retries) {
          const backoffTime = Math.pow(2, attempt) * 1000; // 2초, 4초, 8초...
          this.logger.warn(`Rate limit hit, retrying in ${backoffTime}ms (attempt ${attempt}/${retries})`);
          await this.sleep(backoffTime);
          continue;
        }
        throw error;
      }
    }
    throw new Error('Max retries exceeded');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 네이버 지역 검색 API (이미지 포함)
   */
  async searchPlaces(query: string, display: number = 20, includeImages: boolean = true): Promise<any[]> {
    try {
      const response = await this.callApiWithRetry(async () => {
        return firstValueFrom(
          this.httpService.get(`${this.baseUrl}/local.json`, {
            params: {
              query,
              display,
              sort: 'comment', // 리뷰순
            },
            headers: {
              'X-Naver-Client-Id': this.clientId,
              'X-Naver-Client-Secret': this.clientSecret,
            },
          })
        );
      });

      // 이미지 포함 여부에 따라 변환 방식 결정
      if (includeImages) {
        return this.transformNaverResultsWithImages(response.data.items);
      }
      return this.transformNaverResults(response.data.items);
    } catch (error: any) {
      this.logger.error(`Naver API search failed for "${query}":`, error?.message || error);
      return [];
    }
  }

  /**
   * 네이버 블로그 검색 API - 장소 추가 정보 수집용
   * @param placeName 장소명
   * @param keywords 검색할 키워드 (주차, 디저트 등)
   */
  async searchBlogReviews(placeName: string, keywords: string[] = []): Promise<{
    hasParking: boolean;
    hasWifi: boolean;
    hasDessert: boolean;
    petFriendly: boolean;
    mentions: string[];
  }> {
    try {
      const searchQuery = `${placeName} ${keywords.join(' ')}`.trim();
      
      const response = await this.callApiWithRetry(async () => {
        return firstValueFrom(
          this.httpService.get(`${this.baseUrl}/blog.json`, {
            params: {
              query: searchQuery,
              display: 10,
              sort: 'sim', // 유사도순
            },
            headers: {
              'X-Naver-Client-Id': this.clientId,
              'X-Naver-Client-Secret': this.clientSecret,
            },
          })
        );
      });

      // 블로그 내용에서 키워드 분석
      const items = response.data.items || [];
      const allText = items.map((item: any) => 
        `${this.cleanHtml(item.title)} ${this.cleanHtml(item.description)}`
      ).join(' ').toLowerCase();

      return {
        hasParking: /주차|무료주차|주차가능|파킹/.test(allText),
        hasWifi: /와이파이|wifi|콘센트|충전/.test(allText),
        hasDessert: /디저트|케이크|마카롱|브라우니|쿠키|빙수/.test(allText),
        petFriendly: /애견|반려견|펫|강아지|고양이/.test(allText),
        mentions: this.extractMentions(allText),
      };
    } catch (error: any) {
      this.logger.warn(`Blog search failed for "${placeName}":`, error?.message);
      return {
        hasParking: false,
        hasWifi: false,
        hasDessert: false,
        petFriendly: false,
        mentions: [],
      };
    }
  }

  /**
   * 블로그 내용에서 유용한 키워드 추출
   */
  private extractMentions(text: string): string[] {
    const keywords: string[] = [];
    const patterns: [RegExp, string][] = [
      [/주차\s?(가능|무료|쉬움)/, '주차가능'],
      [/와이파이|wifi/, 'WiFi'],
      [/콘센트/, '콘센트'],
      [/조용|한적/, '조용함'],
      [/넓|spacious/, '넓음'],
      [/분위기\s?(좋|최고)/, '분위기좋음'],
      [/24시|새벽/, '야간영업'],
      [/혼밥|혼자/, '혼밥가능'],
      [/단체|모임/, '단체석'],
      [/예약/, '예약가능'],
      [/뷰|전망|야경/, '전망좋음'],
      [/루프탑|옥상/, '루프탑'],
    ];

    patterns.forEach(([pattern, keyword]) => {
      if (pattern.test(text)) {
        keywords.push(keyword);
      }
    });

    return [...new Set(keywords)];
  }

  /**
   * 위치 기반 장소 검색
   * 네이버 API는 위치 기반 검색을 직접 지원하지 않으므로
   * 일반적인 키워드로 검색 후 거리로 필터링
   */
  async searchPlacesByLocation(
    lat: number,
    lng: number,
    radius: number = 1000,
    display: number = 20
  ): Promise<any[]> {
    try {
      this.logger.debug(`Searching places near ${lat}, ${lng} within ${radius}m`);
      
      // 일반적인 장소 카테고리로 검색
      const searchQueries = ['음식점', '카페', '편의점', '병원', '마트'];
      const allResults: any[] = [];
      
      for (const query of searchQueries) {
        try {
          const results = await this.searchPlaces(query, 10);
          
          // 거리 계산 및 필터링
          const filteredResults = results
            .map((place: any) => ({
              ...place,
              distance: this.calculateDistance(lat, lng, place.latitude, place.longitude),
            }))
            .filter((place: any) => place.distance <= radius);
          
          allResults.push(...filteredResults);
        } catch (e) {
          this.logger.warn(`Search for "${query}" failed:`, e);
        }
      }
      
      // 중복 제거 및 거리순 정렬
      const uniqueResults = this.removeDuplicates(allResults);
      return uniqueResults
        .sort((a: any, b: any) => a.distance - b.distance)
        .slice(0, display);
        
    } catch (error) {
      this.logger.error('Naver API location search failed:', error);
      return [];
    }
  }

  /**
   * 중복 장소 제거
   */
  private removeDuplicates(places: any[]): any[] {
    const seen = new Set<string>();
    return places.filter(place => {
      const key = `${place.latitude}_${place.longitude}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * 장소 상세 정보 검색 (이름과 좌표 기반)
   * 네이버 API는 별도 상세 API가 없으므로 검색 API로 상세 정보 획득
   */
  async getPlaceDetailByNameAndLocation(
    name: string,
    latitude: number,
    longitude: number
  ): Promise<any> {
    try {
      // 장소명으로 검색
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/local.json`, {
          params: {
            query: name,
            display: 5,
            sort: 'comment',
          },
          headers: {
            'X-Naver-Client-Id': this.clientId,
            'X-Naver-Client-Secret': this.clientSecret,
          },
        })
      );

      if (!response.data.items || response.data.items.length === 0) {
        return null;
      }

      // 좌표가 가장 가까운 결과 찾기
      const items = response.data.items.map((item: any) => ({
        ...item,
        distance: this.calculateDistance(
          latitude,
          longitude,
          this.convertMapy(item.mapy),
          this.convertMapx(item.mapx)
        ),
      }));

      // 가장 가까운 결과 반환 (500m 이내)
      const closest = items
        .filter((item: any) => item.distance < 500)
        .sort((a: any, b: any) => a.distance - b.distance)[0];

      if (!closest) {
        return null;
      }

      return this.transformNaverResults([closest])[0];
    } catch (error) {
      this.logger.error('Naver API detail search failed:', error);
      return null;
    }
  }

  /**
   * 두 좌표 간 거리 계산 (미터)
   */
  private calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371000; // 지구 반지름 (미터)
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * 각도를 라디안으로 변환
   */
  private toRad(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }

  /**
   * 장소 상세 정보 (네이버는 별도 상세 API 없음)
   * @deprecated 나중에 삭제 예정
   */
  async getPlaceDetail(id: string): Promise<any> {
    // 네이버 API는 상세 정보 엔드포인트가 없으므로
    // 검색 결과에서 찾거나 null 반환
    return null;
  }

  /**
   * 네이버 이미지 검색 API
   * @param query 검색 키워드 (장소명)
   * @returns 이미지 URL 배열
   */
  async searchImages(query: string, display: number = 3): Promise<string[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/image.json`, {
          params: {
            query,
            display,
            sort: 'sim', // 유사도순
          },
          headers: {
            'X-Naver-Client-Id': this.clientId,
            'X-Naver-Client-Secret': this.clientSecret,
          },
        })
      );

      return response.data.items?.map((item: any) => item.thumbnail) || [];
    } catch (error) {
      this.logger.warn(`Image search failed for "${query}":`, error);
      return [];
    }
  }

  /**
   * 네이버 API 결과 변환 (이미지 포함)
   */
  private async transformNaverResultsWithImages(items: any[]): Promise<any[]> {
    const results = await Promise.all(
      items.map(async (item) => {
        const placeName = this.cleanHtml(item.title);
        
        // 장소명으로 이미지 검색 (비동기)
        let images: string[] = [];
        try {
          images = await this.searchImages(`${placeName} ${item.category?.split('>')[0] || ''}`);
        } catch {
          // 이미지 검색 실패해도 계속 진행
        }

        return {
          id: this.generateId(item),
          name: placeName,
          description: item.description,
          category: item.category,
          address: item.address || item.roadAddress,
          latitude: this.convertMapy(item.mapy),
          longitude: this.convertMapx(item.mapx),
          phone: item.telephone,
          link: item.link,
          images,
          metadata: {
            originalData: item,
          },
        };
      })
    );

    return results;
  }

  /**
   * 네이버 API 결과 변환 (이미지 없이 - 빠른 응답용)
   */
  private transformNaverResults(items: any[]): any[] {
    return items.map(item => ({
      id: this.generateId(item),
      name: this.cleanHtml(item.title),
      description: item.description,
      category: item.category,
      address: item.address || item.roadAddress,
      latitude: this.convertMapy(item.mapy),
      longitude: this.convertMapx(item.mapx),
      phone: item.telephone,
      link: item.link,
      images: [], // 나중에 채워질 수 있음
      metadata: {
        originalData: item,
      },
    }));
  }

  /**
   * HTML 태그 제거
   */
  private cleanHtml(text: string): string {
    return text.replace(/<[^>]*>/g, '');
  }

  /**
   * 네이버 좌표를 위도로 변환
   */
  private convertMapy(mapy: string): number {
    // 네이버 지도 좌표계(KATECH) -> WGS84
    // 간단한 변환 (정확한 변환은 proj4 라이브러리 사용 권장)
    return parseFloat(mapy) / 10000000;
  }

  /**
   * 네이버 좌표를 경도로 변환
   */
  private convertMapx(mapx: string): number {
    return parseFloat(mapx) / 10000000;
  }

  /**
   * 고유 ID 생성
   */
  private generateId(item: any): string {
    return `naver_${item.mapx}_${item.mapy}`;
  }
}
