import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Place, PlaceSource, PlaceCategory } from '../../entities/place.entity';
import { NaverPlacesService } from './services/naver-places.service';
import { PlacesCacheService } from './services/places-cache.service';
import { SearchPlacesDto } from './dto/search-places.dto';
import { CreatePlaceDto } from './dto/create-place.dto';
import { NearbySearchDto } from './dto/nearby-search.dto';

@Injectable()
export class PlacesService {
  private readonly logger = new Logger(PlacesService.name);

  constructor(
    @InjectRepository(Place)
    private readonly placeRepository: Repository<Place>,
    private readonly naverPlacesService: NaverPlacesService,
    private readonly cacheService: PlacesCacheService,
  ) {}

  /**
   * 하이브리드 검색: 내부 DB + 외부 API
   */
  async searchPlaces(searchDto: SearchPlacesDto): Promise<Place[]> {
    const { query, category, limit = 20, useExternal = true } = searchDto;

    // 1. 캐시 확인
    const cacheKey = this.cacheService.generateKey('search', searchDto);
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      this.logger.debug('Returning cached search results');
      return cached;
    }

    let results: Place[] = [];

    // 2. 내부 DB 검색
    const internalResults = await this.searchInternal(query, category, limit);
    results = [...internalResults];

    // 3. 외부 API 검색 (필요시)
    if (useExternal && results.length < limit) {
      try {
        const externalResults = await this.naverPlacesService.searchPlaces(
          query,
          limit - results.length
        );
        
        // 외부 결과를 내부 형식으로 변환하고 캐시
        const convertedResults = await this.processExternalResults(externalResults);
        results = [...results, ...convertedResults];
      } catch (error) {
        this.logger.error('External API search failed:', error);
        // 외부 API 실패시 내부 결과만 반환
      }
    }

    // 4. 결과 캐싱
    await this.cacheService.set(cacheKey, results, 300); // 5분 캐시

    return results;
  }

  /**
   * 내부 DB 검색
   */
  private async searchInternal(
    query: string,
    category?: string,
    limit: number = 20
  ): Promise<Place[]> {
    const qb = this.placeRepository.createQueryBuilder('place');

    // 텍스트 검색
    if (query) {
      qb.where(
        '(place.name ILIKE :query OR place.address ILIKE :query OR place.tags::text ILIKE :query)',
        { query: `%${query}%` }
      );
    }

    // 카테고리 필터
    if (category) {
      qb.andWhere('place.category = :category', { category });
    }

    // 인기순 정렬
    qb.orderBy('place.viewCount', 'DESC')
      .addOrderBy('place.rating', 'DESC')
      .limit(limit);

    return qb.getMany();
  }

  /**
   * 주변 장소 검색
   */
  async searchNearby(nearbyDto: NearbySearchDto): Promise<Place[]> {
    const { lat, lng, radius = 1000, category, limit = 20 } = nearbyDto;

    // PostGIS를 사용한 지리공간 쿼리
    const qb = this.placeRepository.createQueryBuilder('place');

    qb.where(
      `ST_DWithin(
        place.location::geography,
        ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
        :radius
      )`,
      { lat, lng, radius }
    );

    if (category) {
      qb.andWhere('place.category = :category', { category });
    }

    // 거리순 정렬
    qb.orderBy(
      `ST_Distance(
        place.location::geography,
        ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography
      )`,
      'ASC'
    )
    .limit(limit);

    // 거리 계산 추가
    qb.addSelect(
      `ST_Distance(
        place.location::geography,
        ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography
      )`,
      'distance'
    );

    const places = await qb.getMany();

    // 거리 정보 추가
    return places.map(place => ({
      ...place,
      distance: Math.round(place.distance || 0),
    }));
  }

  /**
   * 장소 상세 정보
   */
  async getPlaceDetail(id: string): Promise<Place> {
    const place = await this.placeRepository.findOne({ where: { id } });

    if (!place) {
      // 외부 API에서 검색 시도
      const externalPlace = await this.naverPlacesService.getPlaceDetail(id);
      if (externalPlace) {
        return this.saveExternalPlace(externalPlace);
      }
      throw new Error('Place not found');
    }

    // 조회수 증가
    await this.placeRepository.increment({ id }, 'viewCount', 1);

    return place;
  }

  /**
   * 장소 생성
   */
  async createPlace(createDto: CreatePlaceDto): Promise<Place> {
    const place = this.placeRepository.create({
      ...createDto,
      source: PlaceSource.USER,
      location: {
        type: 'Point',
        coordinates: [createDto.longitude, createDto.latitude],
      } as any,
    } as Partial<Place>);

    return this.placeRepository.save(place);
  }

  /**
   * 인기 장소 조회
   */
  async getPopularPlaces(limit: number = 10): Promise<Place[]> {
    return this.placeRepository.find({
      order: {
        viewCount: 'DESC',
        rating: 'DESC',
      },
      take: limit,
    });
  }

  /**
   * 즐겨찾기 토글
   */
  async toggleFavorite(id: string): Promise<Place> {
    const place = await this.placeRepository.findOne({ where: { id } });
    if (!place) {
      throw new Error('Place not found');
    }

    place.isFavorite = !place.isFavorite;
    return this.placeRepository.save(place);
  }

  /**
   * 외부 API 결과 처리
   */
  private async processExternalResults(externalPlaces: any[]): Promise<Place[]> {
    const processed: Place[] = [];

    for (const external of externalPlaces) {
      // 이미 DB에 있는지 확인
      const existing = await this.placeRepository.findOne({
        where: {
          externalId: external.id,
          source: PlaceSource.NAVER,
        },
      });

      if (existing) {
        processed.push(existing);
      } else {
        // 새로운 장소 저장
        const saved = await this.saveExternalPlace(external);
        processed.push(saved);
      }
    }

    return processed;
  }

  /**
   * 외부 장소 저장
   */
  private async saveExternalPlace(externalPlace: any): Promise<Place> {
    const place = this.placeRepository.create({
      name: externalPlace.name,
      description: externalPlace.description,
      category: this.mapCategory(externalPlace.category) as PlaceCategory,
      address: externalPlace.address,
      latitude: externalPlace.latitude,
      longitude: externalPlace.longitude,
      location: {
        type: 'Point',
        coordinates: [externalPlace.longitude, externalPlace.latitude],
      } as any,
      phone: externalPlace.phone,
      images: externalPlace.images,
      rating: externalPlace.rating,
      source: PlaceSource.NAVER,
      externalId: externalPlace.id,
      metadata: externalPlace.metadata,
    } as Partial<Place>);

    return this.placeRepository.save(place);
  }

  /**
   * 카테고리 매핑
   */
  private mapCategory(externalCategory: string): PlaceCategory {
    const categoryMap: Record<string, PlaceCategory> = {
      '음식점': PlaceCategory.RESTAURANT,
      '카페': PlaceCategory.CAFE,
      '숙박': PlaceCategory.ACCOMMODATION,
      '쇼핑': PlaceCategory.SHOPPING,
      '문화': PlaceCategory.CULTURE,
      '병원': PlaceCategory.HEALTHCARE,
      '편의점': PlaceCategory.CONVENIENCE,
      '교통': PlaceCategory.TRANSPORT,
      '오락': PlaceCategory.ENTERTAINMENT,
    };

    return categoryMap[externalCategory] || PlaceCategory.OTHER;
  }
}
