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
    let { query, category, limit = 20, useExternal = true, lat, lng, radius = 5000 } = searchDto;

    // 0. "근처/주변" 키워드 감지 및 처리
    const nearbyResult = this.parseNearbyQuery(query);
    if (nearbyResult.isNearby) {
      query = nearbyResult.cleanQuery;
      // 근처 검색 시 기본 반경 2km, 위치 필수
      radius = nearbyResult.radius || 2000;
      this.logger.debug(`Nearby search detected: "${query}" within ${radius}m`);
    }

    // 1. 캐시 확인
    const cacheKey = this.cacheService.generateKey('search', { ...searchDto, query, radius });
    const cached = await this.cacheService.get<Place[]>(cacheKey);
    if (cached) {
      this.logger.debug('Returning cached search results');
      return cached;
    }

    let results: Place[] = [];

    // 2. 근처 검색이면 위치 기반 검색 우선
    if (nearbyResult.isNearby && lat && lng) {
      // 위치 기반 검색 먼저 수행
      const nearbyResults = await this.searchNearby({
        lat,
        lng,
        radius,
        category,
        limit,
      });
      
      // 키워드로 필터링
      if (query) {
        const queryLower = query.toLowerCase();
        results = nearbyResults.filter(place =>
          place.name?.toLowerCase().includes(queryLower) ||
          place.category?.toLowerCase().includes(queryLower) ||
          place.tags?.some(tag => tag.toLowerCase().includes(queryLower))
        );
      } else {
        results = nearbyResults;
      }
      
      // 결과가 충분하면 바로 반환
      if (results.length >= limit / 2) {
        await this.cacheService.set(cacheKey, results, 300);
        return results;
      }
    }

    // 3. 내부 DB 검색 (위치 기반 필터링 포함)
    const internalResults = await this.searchInternal(query, category, limit, lat, lng, radius);
    
    // 기존 결과와 병합 (중복 제거)
    const existingIds = new Set(results.map(p => p.id));
    const uniqueInternal = internalResults.filter(p => !existingIds.has(p.id));
    results = [...results, ...uniqueInternal];

    // 3. 외부 API 검색 (필요시)
    if (useExternal && results.length < limit) {
      try {
        let externalResults: any[] = [];
        
        // 3-1. 키워드로 직접 검색 (항상 실행)
        if (query) {
          const keywordResults = await this.naverPlacesService.searchPlaces(
            query,
            limit - results.length
          );
          externalResults = [...keywordResults];
        }
        
        // 3-2. 위치 기반 검색 결과도 추가 (옵션)
        if (lat && lng && externalResults.length < limit - results.length) {
          const locationResults = await this.naverPlacesService.searchPlacesByLocation(
            lat,
            lng,
            radius,
            limit - results.length - externalResults.length
          );
          
          // 중복 제거 (이름+주소 기준)
          const existingKeys = new Set(externalResults.map((p: any) => `${p.name}_${p.address}`));
          const uniqueLocationResults = locationResults.filter((p: any) => 
            !existingKeys.has(`${p.name}_${p.address}`)
          );
          
          externalResults = [...externalResults, ...uniqueLocationResults];
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
   * AI 맞춤 검색: DB에서 키워드, 분위기, 시설 등으로 검색
   * 네이버 API가 아닌 내부 DB에서 직접 검색
   */
  async searchByAICriteria(criteria: {
    keywords?: string[];
    categories?: string[];
    atmosphere?: string[];
    features?: string[];
    recommendFor?: string[];
    location?: string;
    lat?: number;
    lng?: number;
    radius?: number;
    limit?: number;
  }): Promise<Place[]> {
    const { 
      keywords = [], 
      categories = [], 
      atmosphere = [], 
      features = [],
      recommendFor = [],
      location,
      lat, 
      lng, 
      radius = 5000, 
      limit = 20 
    } = criteria;

    this.logger.debug(`AI Search criteria:`, criteria);

    const qb = this.placeRepository.createQueryBuilder('place');

    // 1. 위치 기반 필터링 (선택적)
    if (lat && lng) {
      qb.addSelect(
        `ST_DistanceSphere(
          place.location,
          ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)
        )`,
        'distance'
      )
      .where(
        `ST_DWithin(
          place.location,
          ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
          :radius
        )`,
        { lat, lng, radius }
      );
    }

    // 2. 카테고리 필터
    if (categories.length > 0) {
      const categoryEnums = categories
        .map(c => this.mapCategory(c))
        .filter(c => c !== PlaceCategory.OTHER);
      
      if (categoryEnums.length > 0) {
        qb.andWhere('place.category IN (:...categories)', { categories: categoryEnums });
      }
    }

    // 3. 키워드 검색 (이름, 설명, 태그, 키워드 필드에서)
    if (keywords.length > 0) {
      const keywordConditions = keywords.map((_, i) => `(
        LOWER(place.name) LIKE LOWER(:kw${i}) OR
        LOWER(COALESCE(place.description, '')) LIKE LOWER(:kw${i}) OR
        LOWER(COALESCE(place.tags, '')) LIKE LOWER(:kw${i}) OR
        LOWER(COALESCE(place.keywords, '')) LIKE LOWER(:kw${i}) OR
        LOWER(COALESCE(place.features, '')) LIKE LOWER(:kw${i}) OR
        LOWER(COALESCE(place.atmosphere, '')) LIKE LOWER(:kw${i})
      )`).join(' OR ');
      
      const keywordParams: Record<string, string> = {};
      keywords.forEach((kw, i) => {
        keywordParams[`kw${i}`] = `%${kw}%`;
      });
      
      qb.andWhere(`(${keywordConditions})`, keywordParams);
    }

    // 4. 분위기 필터
    if (atmosphere.length > 0) {
      const atmosphereConditions = atmosphere.map((_, i) => 
        `LOWER(COALESCE(place.atmosphere, '')) LIKE LOWER(:atm${i})`
      ).join(' OR ');
      
      const atmosphereParams: Record<string, string> = {};
      atmosphere.forEach((atm, i) => {
        atmosphereParams[`atm${i}`] = `%${atm}%`;
      });
      
      qb.andWhere(`(${atmosphereConditions})`, atmosphereParams);
    }

    // 5. 시설/특징 필터
    if (features.length > 0) {
      const featureConditions = features.map((_, i) => 
        `LOWER(COALESCE(place.features, '')) LIKE LOWER(:feat${i})`
      ).join(' OR ');
      
      const featureParams: Record<string, string> = {};
      features.forEach((feat, i) => {
        featureParams[`feat${i}`] = `%${feat}%`;
      });
      
      qb.andWhere(`(${featureConditions})`, featureParams);
    }

    // 6. 추천 대상 필터
    if (recommendFor.length > 0) {
      const recConditions = recommendFor.map((_, i) => 
        `LOWER(COALESCE(place.recommendFor, '')) LIKE LOWER(:rec${i})`
      ).join(' OR ');
      
      const recParams: Record<string, string> = {};
      recommendFor.forEach((rec, i) => {
        recParams[`rec${i}`] = `%${rec}%`;
      });
      
      qb.andWhere(`(${recConditions})`, recParams);
    }

    // 7. 지역명 필터 (주소에서)
    if (location) {
      qb.andWhere('LOWER(place.address) LIKE LOWER(:location)', { location: `%${location}%` });
    }

    // 정렬: 거리 또는 평점
    if (lat && lng) {
      qb.orderBy('distance', 'ASC');
    } else {
      qb.orderBy('place.rating', 'DESC', 'NULLS LAST');
    }

    qb.addOrderBy('place.viewCount', 'DESC');
    qb.take(limit);

    const places = await qb.getRawAndEntities();
    
    // 거리 정보 추가
    return places.entities.map((place, index) => ({
      ...place,
      distance: places.raw[index]?.distance 
        ? Math.round(parseFloat(places.raw[index].distance))
        : undefined,
    }));
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
   * @param createDto 장소 생성 정보
   * @param userId 생성자 ID (감사/추적용)
   */
  async createPlace(createDto: CreatePlaceDto, userId: string): Promise<Place> {
    this.logger.log(`User ${userId} is creating a new place: ${createDto.name}`);
    
    const place = this.placeRepository.create({
      ...createDto,
      source: PlaceSource.USER,
      location: {
        type: 'Point',
        coordinates: [createDto.longitude, createDto.latitude],
      } as any,
      // 생성자 정보 기록 (metadata에 저장)
      metadata: {
        createdBy: userId,
        createdAt: new Date().toISOString(),
      },
    } as Partial<Place>);

    const savedPlace = await this.placeRepository.save(place);
    this.logger.log(`Place created successfully: ${savedPlace.id} by user ${userId}`);
    
    return savedPlace;
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
   * @param id 장소 ID
   * @param userId 사용자 ID (권한 확인 및 감사용)
   */
  async toggleFavorite(id: string, userId: string): Promise<Place> {
    const place = await this.placeRepository.findOne({ where: { id } });
    if (!place) {
      throw new Error('Place not found');
    }

    // 즐겨찾기 상태 토글
    const previousState = place.isFavorite;
    place.isFavorite = !place.isFavorite;
    
    // 감사 로그
    this.logger.log(
      `User ${userId} toggled favorite for place ${id}: ${previousState} → ${place.isFavorite}`
    );
    
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
    const category = this.mapCategory(externalPlace.category) as PlaceCategory;
    const aiData = this.generateAISearchData(externalPlace, category);
    
    const place = this.placeRepository.create({
      name: externalPlace.name,
      description: externalPlace.description || this.generateDescription(externalPlace),
      category,
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
      isOpen: this.calculateIsOpen(),
      // AI 검색용 필드
      features: aiData.features,
      atmosphere: aiData.atmosphere,
      keywords: aiData.keywords,
      recommendFor: aiData.recommendFor,
      tags: aiData.tags,
      metadata: {
        ...externalPlace.metadata,
        originalCategory: externalPlace.category,
      },
    } as Partial<Place>);

    return this.placeRepository.save(place);
  }

  /**
   * AI 검색용 데이터 자동 생성
   */
  private generateAISearchData(externalPlace: any, category: PlaceCategory): {
    features: string[];
    atmosphere: string[];
    keywords: string[];
    recommendFor: string[];
    tags: string[];
  } {
    const originalCategory = externalPlace.category?.toLowerCase() || '';
    const name = externalPlace.name?.toLowerCase() || '';
    const address = externalPlace.address?.toLowerCase() || '';
    
    const features: string[] = [];
    const atmosphere: string[] = [];
    const keywords: string[] = [];
    const recommendFor: string[] = [];
    const tags: string[] = [];

    // 카테고리 기반 기본 특징 추가
    switch (category) {
      case PlaceCategory.CAFE:
        atmosphere.push('여유로운', '대화하기 좋은');
        recommendFor.push('친구', '연인', '혼자');
        tags.push('카페', '커피', '디저트');
        if (originalCategory.includes('베이커리')) {
          tags.push('빵', '베이커리');
          features.push('빵구매가능');
        }
        break;
      case PlaceCategory.RESTAURANT:
        recommendFor.push('가족', '친구', '연인');
        tags.push('음식점', '식당');
        if (originalCategory.includes('한식')) {
          tags.push('한식', '한정식');
          atmosphere.push('전통적인');
        } else if (originalCategory.includes('일식')) {
          tags.push('일식', '스시', '초밥');
        } else if (originalCategory.includes('중식')) {
          tags.push('중식', '중국집');
        } else if (originalCategory.includes('양식')) {
          tags.push('양식', '파스타', '스테이크');
          atmosphere.push('모던한');
        }
        break;
      case PlaceCategory.ACCOMMODATION:
        features.push('숙박');
        recommendFor.push('여행객', '커플', '가족');
        tags.push('숙박', '호텔', '숙소');
        if (originalCategory.includes('호텔')) {
          features.push('조식', '룸서비스');
          atmosphere.push('고급스러운');
        }
        break;
      case PlaceCategory.SHOPPING:
        tags.push('쇼핑', '마트');
        recommendFor.push('쇼핑객');
        break;
      case PlaceCategory.HEALTHCARE:
        tags.push('병원', '의료');
        features.push('진료');
        break;
      case PlaceCategory.CONVENIENCE:
        features.push('24시간', '빠른구매');
        tags.push('편의점');
        recommendFor.push('급한용무');
        break;
    }

    // 이름에서 키워드 추출
    const nameKeywords = this.extractKeywordsFromName(name);
    keywords.push(...nameKeywords);

    // 주소에서 지역 키워드 추출
    const areaKeywords = this.extractAreaKeywords(address);
    keywords.push(...areaKeywords);

    // 원본 카테고리에서 키워드 추출
    if (originalCategory) {
      const catParts = originalCategory.split(/[>,]/);
      catParts.forEach((part: string) => {
        const trimmed = part.trim();
        if (trimmed && trimmed.length > 1) {
          tags.push(trimmed);
        }
      });
    }

    // 중복 제거
    return {
      features: [...new Set(features)],
      atmosphere: [...new Set(atmosphere)],
      keywords: [...new Set(keywords)],
      recommendFor: [...new Set(recommendFor)],
      tags: [...new Set(tags)],
    };
  }

  /**
   * 장소명에서 키워드 추출
   */
  private extractKeywordsFromName(name: string): string[] {
    const keywords: string[] = [];
    
    // 특정 키워드 패턴 매칭
    const patterns: [RegExp, string[]][] = [
      [/24시|24시간|올나잇/, ['24시간', '야간영업']],
      [/무인|셀프/, ['무인', '셀프서비스']],
      [/드라이브|드라이브스루/, ['드라이브스루']],
      [/배달|딜리버리/, ['배달가능']],
      [/테이크아웃|포장/, ['포장가능']],
      [/루프탑|옥상/, ['루프탑', '야경']],
      [/뷰|전망/, ['전망좋은', '뷰맛집']],
      [/펫|애견|반려/, ['애견동반', '펫프렌들리']],
      [/키즈|아이|어린이/, ['키즈존', '아이와함께']],
      [/데이트|커플/, ['데이트', '연인추천']],
      [/혼밥|혼자/, ['혼밥', '1인식사']],
      [/맛집/, ['맛집']],
      [/노포|원조/, ['노포', '오래된맛집']],
    ];

    patterns.forEach(([pattern, kws]) => {
      if (pattern.test(name)) {
        keywords.push(...kws);
      }
    });

    return keywords;
  }

  /**
   * 주소에서 지역 키워드 추출
   */
  private extractAreaKeywords(address: string): string[] {
    const keywords: string[] = [];
    
    // 주요 지역명 추출
    const areaPatterns = [
      /강남|서초|송파|강동|강서|마포|영등포|용산|종로|중구|성동|광진|동대문|성북|강북|도봉|노원|은평|서대문|동작|관악|금천|구로|양천/g,
      /홍대|이태원|신사|압구정|청담|성수|건대|왕십리|합정|망원|연남|해방촌|경리단길|가로수길/g,
    ];

    areaPatterns.forEach(pattern => {
      const matches = address.match(pattern);
      if (matches) {
        keywords.push(...matches);
      }
    });

    return keywords;
  }

  /**
   * "근처/주변" 키워드 파싱
   * @returns { isNearby: boolean, cleanQuery: string, radius?: number }
   */
  private parseNearbyQuery(query: string): { isNearby: boolean; cleanQuery: string; radius?: number } {
    if (!query) return { isNearby: false, cleanQuery: query };
    
    // 근처/주변 관련 키워드 패턴
    const nearbyPatterns = [
      { pattern: /근처\s*/gi, radius: 2000 },      // 근처 → 2km
      { pattern: /주변\s*/gi, radius: 2000 },      // 주변 → 2km
      { pattern: /가까운\s*/gi, radius: 1000 },    // 가까운 → 1km
      { pattern: /인근\s*/gi, radius: 3000 },      // 인근 → 3km
      { pattern: /내\s*주변\s*/gi, radius: 1000 }, // 내 주변 → 1km
      { pattern: /여기\s*근처\s*/gi, radius: 1000 }, // 여기 근처 → 1km
      { pattern: /이\s*근처\s*/gi, radius: 1000 },   // 이 근처 → 1km
      { pattern: /nearby\s*/gi, radius: 2000 },
      { pattern: /near\s*me\s*/gi, radius: 1000 },
    ];
    
    // 거리 지정 패턴 (예: "500m 내", "1km 이내", "2킬로 안")
    const distancePatterns = [
      { pattern: /(\d+)\s*m\s*(내|이내|안에?|반경)?\s*/gi, unit: 1 },
      { pattern: /(\d+)\s*(km|킬로)\s*(내|이내|안에?|반경)?\s*/gi, unit: 1000 },
      { pattern: /(\d+)\s*미터\s*(내|이내|안에?|반경)?\s*/gi, unit: 1 },
      { pattern: /반경\s*(\d+)\s*m\s*/gi, unit: 1 },
      { pattern: /반경\s*(\d+)\s*(km|킬로)\s*/gi, unit: 1000 },
    ];
    
    let isNearby = false;
    let cleanQuery = query;
    let radius: number | undefined;
    
    // 1. 거리 지정 패턴 먼저 확인
    for (const { pattern, unit } of distancePatterns) {
      const match = pattern.exec(query);
      if (match) {
        isNearby = true;
        radius = parseInt(match[1], 10) * unit;
        cleanQuery = cleanQuery.replace(pattern, '');
        break;
      }
    }
    
    // 2. 근처/주변 키워드 확인
    for (const { pattern, radius: defaultRadius } of nearbyPatterns) {
      if (pattern.test(cleanQuery)) {
        isNearby = true;
        cleanQuery = cleanQuery.replace(pattern, '');
        if (!radius) radius = defaultRadius;
        break;
      }
    }
    
    // 쿼리 정리 (앞뒤 공백 제거)
    cleanQuery = cleanQuery.trim();
    
    // 최소/최대 반경 제한
    if (radius) {
      radius = Math.max(100, Math.min(radius, 10000)); // 100m ~ 10km
    }
    
    return { isNearby, cleanQuery, radius };
  }

  /**
   * 현재 영업 상태 계산 (기본 영업시간: 09:00~22:00)
   */
  private calculateIsOpen(): boolean {
    const now = new Date();
    const hour = now.getHours();
    // 기본적으로 09시~22시 사이면 영업 중으로 간주
    return hour >= 9 && hour < 22;
  }

  /**
   * 장소 설명 생성
   */
  private generateDescription(place: any): string {
    const parts: string[] = [];
    if (place.category) {
      parts.push(place.category.split('>').pop()?.trim() || place.category);
    }
    if (place.address) {
      const shortAddr = place.address.split(' ').slice(0, 3).join(' ');
      parts.push(shortAddr);
    }
    return parts.join(' | ') || '';
  }

  /**
   * 카테고리 매핑 (부분 문자열 매칭 지원)
   * 네이버 API는 "카페,디저트>베이커리" 형태로 반환
   */
  private mapCategory(externalCategory: string): PlaceCategory {
    if (!externalCategory) return PlaceCategory.OTHER;
    
    const categoryLower = externalCategory.toLowerCase();
    
    // 키워드 기반 매핑 (포함 여부로 판단)
    const categoryKeywords: [string[], PlaceCategory][] = [
      [['카페', 'cafe', '커피', '디저트', '베이커리', '빵'], PlaceCategory.CAFE],
      [['음식점', '식당', '맛집', '한식', '중식', '일식', '양식', '레스토랑', 'restaurant'], PlaceCategory.RESTAURANT],
      [['숙박', '호텔', '모텔', '펜션', '게스트하우스', 'hotel'], PlaceCategory.ACCOMMODATION],
      [['쇼핑', '마트', '백화점', '상점', '몰', 'shop', 'mall'], PlaceCategory.SHOPPING],
      [['문화', '박물관', '미술관', '공연', '전시', '극장', '영화'], PlaceCategory.CULTURE],
      [['병원', '의원', '약국', '의료', 'hospital', 'clinic'], PlaceCategory.HEALTHCARE],
      [['편의점', 'gs25', 'cu', '세븐일레븐', '이마트24', 'convenience'], PlaceCategory.CONVENIENCE],
      [['교통', '지하철', '버스', '기차', '역', 'station', 'transport'], PlaceCategory.TRANSPORT],
      [['오락', '게임', '노래방', '볼링', 'entertainment', '놀이'], PlaceCategory.ENTERTAINMENT],
    ];
    
    for (const [keywords, category] of categoryKeywords) {
      if (keywords.some(keyword => categoryLower.includes(keyword))) {
        return category;
      }
    }
    
    return PlaceCategory.OTHER;
  }
}
