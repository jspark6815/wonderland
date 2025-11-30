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

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.clientId = this.configService.get<string>('NAVER_CLIENT_ID') || '';
    this.clientSecret = this.configService.get<string>('NAVER_CLIENT_SECRET') || '';
  }

  /**
   * 네이버 지역 검색 API
   */
  async searchPlaces(query: string, display: number = 20): Promise<any[]> {
    try {
      const response = await firstValueFrom(
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

      return this.transformNaverResults(response.data.items);
    } catch (error) {
      this.logger.error('Naver API search failed:', error);
      return [];
    }
  }

  /**
   * 장소 상세 정보 (네이버는 별도 상세 API 없음)
   */
  async getPlaceDetail(id: string): Promise<any> {
    // 네이버 API는 상세 정보 엔드포인트가 없으므로
    // 검색 결과에서 찾거나 null 반환
    return null;
  }

  /**
   * 네이버 API 결과 변환
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
