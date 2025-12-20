import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Point,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum PlaceCategory {
  RESTAURANT = 'RESTAURANT',
  CAFE = 'CAFE',
  ACCOMMODATION = 'ACCOMMODATION',
  SHOPPING = 'SHOPPING',
  CULTURE = 'CULTURE',
  HEALTHCARE = 'HEALTHCARE',
  CONVENIENCE = 'CONVENIENCE',
  TRANSPORT = 'TRANSPORT',
  ENTERTAINMENT = 'ENTERTAINMENT',
  OTHER = 'OTHER',
}

export enum PlaceSource {
  INTERNAL = 'INTERNAL',    // 내부 DB
  NAVER = 'NAVER',          // 네이버 API
  KAKAO = 'KAKAO',          // 카카오 API
  USER = 'USER',            // 사용자 등록
  AI = 'AI',                // AI 추천
}

@Entity('places')
@Index(['latitude', 'longitude'])
@Index(['category'])
@Index(['source'])
@Index(['rating']) // 평점 필터 최적화
@Index(['viewCount']) // 인기순 정렬 최적화
@Index(['createdAt']) // 최신순 정렬 최적화
@Index(['name']) // 이름 검색 최적화
export class Place {
  @ApiProperty({ description: '장소 ID', example: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: '장소명', example: '스타벅스 강남점' })
  @Column()
  name: string;

  @ApiPropertyOptional({ description: '장소 설명', example: '넓고 쾌적한 카페' })
  @Column({ nullable: true })
  description?: string;

  @ApiProperty({ 
    description: '카테고리', 
    enum: PlaceCategory,
    example: PlaceCategory.CAFE 
  })
  @Column({
    type: 'enum',
    enum: PlaceCategory,
    default: PlaceCategory.OTHER,
  })
  category: PlaceCategory;

  @ApiProperty({ description: '주소', example: '서울특별시 강남구 강남대로 390' })
  @Column()
  address: string;

  @ApiPropertyOptional({ description: '상세 주소', example: '2층' })
  @Column({ nullable: true })
  detailAddress?: string;

  @ApiProperty({ description: '위도', example: 37.4979 })
  @Column('decimal', { precision: 10, scale: 8 })
  latitude: number;

  @ApiProperty({ description: '경도', example: 127.0276 })
  @Column('decimal', { precision: 11, scale: 8 })
  longitude: number;

  @Column({
    type: 'geometry',
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true,
  })
  location?: Point;

  @ApiPropertyOptional({ description: '전화번호', example: '02-1234-5678' })
  @Column({ nullable: true })
  phone?: string;

  @ApiPropertyOptional({ description: '웹사이트', example: 'https://www.example.com' })
  @Column({ nullable: true })
  website?: string;

  @ApiPropertyOptional({ 
    description: '이미지 URL 목록', 
    type: [String],
    example: ['https://example.com/image1.jpg'] 
  })
  @Column('simple-array', { nullable: true })
  images?: string[];

  @ApiPropertyOptional({ 
    description: '영업시간',
    example: { monday: { open: '09:00', close: '22:00' } }
  })
  @Column('simple-json', { nullable: true })
  businessHours?: {
    [key: string]: { open: string; close: string };
  };

  @ApiPropertyOptional({ description: '평점', example: 4.5 })
  @Column('decimal', { precision: 2, scale: 1, nullable: true })
  rating?: number;

  @ApiProperty({ description: '리뷰 수', example: 342 })
  @Column({ default: 0 })
  reviewCount: number;

  @ApiPropertyOptional({ 
    description: '가격대',
    example: { min: 5000, max: 15000, currency: 'KRW' }
  })
  @Column('simple-json', { nullable: true })
  priceRange?: {
    min: number;
    max: number;
    currency: string;
  };

  @ApiPropertyOptional({ 
    description: '태그 목록',
    type: [String],
    example: ['WiFi', '주차가능', '애견동반']
  })
  @Column('simple-array', { nullable: true })
  tags?: string[];

  // ============ AI 검색 최적화용 컬럼 ============

  @ApiPropertyOptional({ 
    description: '시설/편의시설 목록',
    type: [String],
    example: ['주차', 'WiFi', '단체석', '개인룸', '예약가능', '배달가능']
  })
  @Column('simple-array', { nullable: true })
  features?: string[];

  @ApiPropertyOptional({ 
    description: '분위기/특징',
    type: [String],
    example: ['조용한', '로맨틱', '가족모임', '비즈니스', '데이트', '혼밥가능']
  })
  @Column('simple-array', { nullable: true })
  atmosphere?: string[];

  @ApiPropertyOptional({ 
    description: 'AI 검색용 키워드 (자동 생성)',
    type: [String],
    example: ['주차되는', '애견동반', '24시간', '야경맛집']
  })
  @Column('simple-array', { nullable: true })
  keywords?: string[];

  @ApiPropertyOptional({ 
    description: '메뉴/상품 정보',
    example: [{ name: '아메리카노', price: 4500 }, { name: '라떼', price: 5000 }]
  })
  @Column('simple-json', { nullable: true })
  menu?: Array<{ name: string; price?: number; description?: string }>;

  @ApiPropertyOptional({ 
    description: '추천 대상',
    type: [String],
    example: ['연인', '가족', '친구', '혼자', '비즈니스']
  })
  @Column('simple-array', { nullable: true })
  recommendFor?: string[];

  @ApiPropertyOptional({ 
    description: '특별 정보',
    example: { parking: '무료주차 30대', petFriendly: true, reservation: '네이버예약' }
  })
  @Column('simple-json', { nullable: true })
  specialInfo?: {
    parking?: string;
    petFriendly?: boolean;
    reservation?: string;
    delivery?: boolean;
    takeout?: boolean;
    wifi?: boolean;
    smoking?: string;
    kidsZone?: boolean;
  };

  @ApiPropertyOptional({ description: '거리 (미터)', example: 500 })
  @Column({ nullable: true })
  distance?: number; // 계산된 거리 (미터)

  @ApiPropertyOptional({ description: '현재 영업 상태', example: true })
  @Column({ nullable: true })
  isOpen?: boolean; // 현재 영업 상태

  @ApiProperty({ 
    description: '데이터 출처',
    enum: PlaceSource,
    example: PlaceSource.INTERNAL
  })
  @Column({
    type: 'enum',
    enum: PlaceSource,
    default: PlaceSource.INTERNAL,
  })
  source: PlaceSource;

  @ApiPropertyOptional({ description: '외부 API ID' })
  @Column({ nullable: true })
  externalId?: string; // 외부 API ID

  @ApiProperty({ description: '즐겨찾기 여부', example: false })
  @Column({ default: false })
  isFavorite: boolean;

  @ApiProperty({ description: '조회수', example: 0 })
  @Column({ default: 0 })
  viewCount: number;

  @ApiPropertyOptional({ description: '추가 메타데이터' })
  @Column('simple-json', { nullable: true })
  metadata?: Record<string, any>;

  @ApiProperty({ description: '생성일시' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: '수정일시' })
  @UpdateDateColumn()
  updatedAt: Date;

  // ============ 고급 데이터 관리 ============

  @ApiPropertyOptional({ description: '삭제일시 (Soft Delete)' })
  @Column({ nullable: true })
  @Index()
  deletedAt?: Date;

  @ApiPropertyOptional({ description: '버전 (Optimistic Locking)' })
  @Column({ default: 1 })
  version: number;

  /**
   * Full-text Search용 tsvector 컬럼
   * PostgreSQL에서 name, description, tags, keywords를 결합한 검색 인덱스
   * 마이그레이션에서 트리거로 자동 업데이트
   */
  @Column({
    type: 'tsvector',
    nullable: true,
    select: false, // 일반 조회 시 제외
  })
  @Index('idx_places_search_vector', { synchronize: false }) // GIN 인덱스는 마이그레이션에서 생성
  searchVector?: string;
}
