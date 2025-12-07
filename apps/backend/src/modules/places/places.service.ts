import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Place, PlaceSource, PlaceCategory } from '../../entities/place.entity';
import { NaverPlacesService } from './services/naver-places.service';
import { PlacesCacheService } from './services/places-cache.service';
import { SearchPlacesDto } from './dto/search-places.dto';
import { CreatePlaceDto } from './dto/create-place.dto';
import { NearbySearchDto } from './dto/nearby-search.dto';
import { BoundsSearchDto } from './dto/bounds-search.dto';

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
   * 하이브리드 검색: 내부 DB + 외부 API (위치 기반 필터링 지원)
   */
  async searchPlaces(searchDto: SearchPlacesDto): Promise<Place[]> {
    const { query, category, limit = 20, useExternal = true, lat, lng, radius = 5000 } = searchDto;

    // 1. 캐시 확인
    const cacheKey = this.cacheService.generateKey('search', searchDto);
    const cached = await this.cacheService.get<Place[]>(cacheKey);
    if (cached) {
      this.logger.debug('Returning cached search results');
      return cached;
    }

    let results: Place[] = [];

    // 2. 내부 DB 검색 (위치 기반 필터링 포함)
    const internalResults = await this.searchInternal(query, category, limit, lat, lng, radius);
    results = [...internalResults];

    // 3. 외부 API 검색 (필요시)
    if (useExternal && results.length < limit) {
      try {
        // 위치가 있으면 위치 기반 검색, 없으면 키워드 검색
        let externalResults;
        if (lat && lng) {
          externalResults = await this.naverPlacesService.searchPlacesByLocation(
            lat,
            lng,
            radius,
            limit - results.length
          );
          // 키워드로 추가 필터링
          if (query) {
            externalResults = externalResults.filter((place: any) => 
              place.name?.toLowerCase().includes(query.toLowerCase()) ||
              place.address?.toLowerCase().includes(query.toLowerCase()) ||
              place.category?.toLowerCase().includes(query.toLowerCase())
            );
          }
        } else {
          externalResults = await this.naverPlacesService.searchPlaces(
            query,
            limit - results.length
          );
        }
        
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
   * 내부 DB 검색 (위치 기반 필터링 지원)
   */
  private async searchInternal(
    query: string,
    category?: string,
    limit: number = 20,
    lat?: number,
    lng?: number,
    radius?: number
  ): Promise<Place[]> {
    const qb = this.placeRepository.createQueryBuilder('place');

    // 위치 기반 필터링 (lat, lng가 있으면)
    if (lat && lng && radius) {
      qb.where(
        `ST_DWithin(
          place.location::geography,
          ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
          :radius
        )`,
        { lat, lng, radius }
      );

      // 텍스트 검색 (AND 조건)
      if (query) {
        qb.andWhere(
          '(place.name ILIKE :query OR place.address ILIKE :query OR place.tags::text ILIKE :query)',
          { query: `%${query}%` }
        );
      }

      // 거리순 정렬
      qb.addSelect(
        `ST_Distance(
          place.location::geography,
          ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography
        )`,
        'distance'
      );
      qb.orderBy('distance', 'ASC');
    } else {
      // 위치 없이 텍스트 검색
      if (query) {
        qb.where(
          '(place.name ILIKE :query OR place.address ILIKE :query OR place.tags::text ILIKE :query)',
          { query: `%${query}%` }
        );
      }
      
      // 인기순 정렬
      qb.orderBy('place.viewCount', 'DESC')
        .addOrderBy('place.rating', 'DESC');
    }

    // 카테고리 필터
    if (category) {
      qb.andWhere('place.category = :category', { category });
    }

    qb.limit(limit);

    return qb.getMany();
  }

  /**
   * 주변 장소 검색
   */
  async searchNearby(nearbyDto: NearbySearchDto): Promise<Place[]> {
    const { lat, lng, radius = 1000, category, limit = 20 } = nearbyDto;

    // 캐시 확인
    const cacheKey = this.cacheService.generateKey('nearby', nearbyDto);
    const cached = await this.cacheService.get<Place[]>(cacheKey);
    if (cached) {
      this.logger.debug('Returning cached nearby results');
      return cached;
    }

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

    let places = await qb.getMany();

    // 외부 API 검색 (필요시)
    if (places.length < limit) {
      try {
        const centerLat = lat;
        const centerLng = lng;
        const externalResults = await this.naverPlacesService.searchPlacesByLocation(
          centerLat,
          centerLng,
          radius,
          limit - places.length
        );
        
        const convertedResults = await this.processExternalResults(externalResults);
        places = [...places, ...convertedResults].slice(0, limit);
      } catch (error) {
        this.logger.error('External API search failed:', error);
      }
    }

    // 거리 정보 추가 및 캐싱
    const result = places.map(place => ({
      ...place,
      distance: Math.round(place.distance || 0),
    }));

    await this.cacheService.set(cacheKey, result, 300); // 5분 캐시
    return result;
  }

  /**
   * 지도 영역(bounds) 기반 장소 검색
   */
  async searchByBounds(boundsDto: BoundsSearchDto): Promise<Place[]> {
    const { south, north, west, east, category, limit = 50, useExternal = true } = boundsDto;

    // 캐시 확인 (bounds 기반 캐시 키)
    const cacheKey = this.cacheService.generateKey('bounds', boundsDto);
    const cached = await this.cacheService.get<Place[]>(cacheKey);
    if (cached) {
      this.logger.debug('Returning cached bounds results');
      return cached;
    }

    // PostGIS를 사용한 영역 검색
    const qb = this.placeRepository.createQueryBuilder('place');

    // 지도 영역 내 장소 검색
    qb.where(
      `ST_Within(
        place.location::geometry,
        ST_MakeEnvelope(:west, :south, :east, :north, 4326)
      )`,
      { west, south, east, north }
    );

    if (category) {
      qb.andWhere('place.category = :category', { category });
    }

    // 인기순 정렬
    qb.orderBy('place.viewCount', 'DESC')
      .addOrderBy('place.rating', 'DESC')
      .limit(limit);

    let places = await qb.getMany();

    // 외부 API 검색 (필요시)
    if (useExternal && places.length < limit) {
      try {
        const centerLat = (south + north) / 2;
        const centerLng = (west + east) / 2;
        const radius = this.calculateRadius(south, north, west, east);
        
        const externalResults = await this.naverPlacesService.searchPlacesByLocation(
          centerLat,
          centerLng,
          radius,
          limit - places.length
        );
        
        // bounds 내부에 있는 것만 필터링
        const filteredExternal = externalResults.filter(place => 
          place.latitude >= south && 
          place.latitude <= north && 
          place.longitude >= west && 
          place.longitude <= east
        );
        
        const convertedResults = await this.processExternalResults(filteredExternal);
        places = [...places, ...convertedResults].slice(0, limit);
      } catch (error) {
        this.logger.error('External API search failed:', error);
      }
    }

    // 캐싱 (bounds 검색은 10분 캐시)
    await this.cacheService.set(cacheKey, places, 600);
    return places;
  }

  /**
   * bounds로부터 반경 계산 (미터)
   */
  private calculateRadius(south: number, north: number, west: number, east: number): number {
    // 대략적인 거리 계산 (Haversine 공식 사용)
    const latDiff = north - south;
    const lngDiff = east - west;
    const avgLat = (south + north) / 2;
    
    // 위도 1도 ≈ 111km, 경도 1도 ≈ 111km * cos(위도)
    const latMeters = latDiff * 111000;
    const lngMeters = lngDiff * 111000 * Math.cos(avgLat * Math.PI / 180);
    
    // 대각선 거리 반환
    return Math.sqrt(latMeters * latMeters + lngMeters * lngMeters);
  }

  /**
   * 장소 상세 정보
   */
  async getPlaceDetail(id: string): Promise<Place> {
    // 1. DB에서 먼저 찾기
    let place = await this.placeRepository.findOne({ where: { id } });

    if (place) {
      // 조회수 증가
      await this.placeRepository.increment({ id }, 'viewCount', 1);
      return place;
    }

    // 2. DB에 없으면 네이버 API에서 검색 시도
    // ID가 네이버 형식인지 확인 (naver_로 시작)
    if (id.startsWith('naver_')) {
      this.logger.debug(`Place not found in DB, searching Naver API for: ${id}`);
      
      // 네이버 ID에서 좌표 추출 시도
      const parts = id.split('_');
      if (parts.length >= 3) {
        try {
          const mapx = parseFloat(parts[1]);
          const mapy = parseFloat(parts[2]);
          const longitude = mapx / 10000000;
          const latitude = mapy / 10000000;
          
          // 좌표로 검색 (이름은 알 수 없으므로 주변 검색)
          // 실제로는 마커 클릭 시 이름과 좌표를 함께 전달해야 함
          this.logger.warn(`Cannot search Naver API without place name. ID: ${id}`);
        } catch (error) {
          this.logger.error(`Failed to parse Naver ID: ${id}`, error);
        }
      }
    }

    throw new Error('Place not found');
  }

  /**
   * 이름과 좌표로 장소 상세 정보 가져오기 (마커 클릭 시 사용)
   */
  async getPlaceDetailByNameAndLocation(
    name: string,
    latitude: number,
    longitude: number
  ): Promise<Place> {
    // 1. DB에서 먼저 찾기 (이름과 좌표로)
    const places = await this.placeRepository
      .createQueryBuilder('place')
      .where('place.name = :name', { name })
      .andWhere(
        `ST_DWithin(
          place.location::geography,
          ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
          100
        )`,
        { lat: latitude, lng: longitude }
      )
      .getMany();

    if (places.length > 0) {
      const place = places[0];
      // 조회수 증가
      await this.placeRepository.increment({ id: place.id }, 'viewCount', 1);
      return place;
    }

    // 2. DB에 없으면 네이버 API에서 검색하여 저장
    this.logger.debug(`Place not found in DB, searching Naver API: ${name}`);
    
    try {
      const externalPlace = await this.naverPlacesService.getPlaceDetailByNameAndLocation(
        name,
        latitude,
        longitude
      );

      if (externalPlace) {
        // 네이버 API 결과를 DB에 저장
        const savedPlace = await this.saveExternalPlace(externalPlace);
        
        // 조회수 증가
        await this.placeRepository.increment({ id: savedPlace.id }, 'viewCount', 1);
        
        return savedPlace;
      }
    } catch (error) {
      this.logger.error('Failed to fetch place from Naver API:', error);
    }

    throw new Error('Place not found');
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
