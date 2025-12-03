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
   * 위치 기반 장소 검색
   */
  async searchPlacesByLocation(
    lat: number,
    lng: number,
    radius: number = 1000,
    display: number = 20
  ): Promise<any[]> {
    try {
      // 네이버 지역 검색 API는 위치 기반 검색을 지원하지 않으므로
      // 중심점 주변의 장소를 검색하기 위해 주소로 변환하거나
      // 일반 검색을 수행
      // 여기서는 간단히 빈 배열 반환 (실제로는 geocoding 후 검색 필요)
      this.logger.debug(`Searching places near ${lat}, ${lng} within ${radius}m`);
      
      // TODO: 네이버 지오코딩 API를 사용하여 주소 변환 후 검색
      // 현재는 빈 배열 반환
      return [];
    } catch (error) {
      this.logger.error('Naver API location search failed:', error);
      return [];
    }
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
