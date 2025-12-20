import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { User } from './user.entity';
import { PlaceCategory } from './place.entity';

/**
 * 사용자 선호도 엔티티
 * AI 개인화 추천을 위한 사용자 프로파일
 * 
 * - 검색/방문/피드백 데이터 기반 자동 학습
 * - 명시적 선호도 + 암시적 행동 분석
 * - Collaborative Filtering 기반 추천에 활용
 */
@Entity('user_preferences')
@Index(['userId'])
export class UserPreference {
  @ApiProperty({ description: '선호도 ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: '사용자 ID' })
  @Column('uuid', { unique: true })
  userId: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  // ============ 카테고리 선호도 (0.0 ~ 1.0) ============
  // 각 카테고리별 선호도 점수 (검색/방문/피드백 기반 계산)

  @ApiPropertyOptional({ description: '카페 선호도' })
  @Column('decimal', { precision: 3, scale: 2, default: 0.5 })
  prefCafe: number;

  @ApiPropertyOptional({ description: '음식점 선호도' })
  @Column('decimal', { precision: 3, scale: 2, default: 0.5 })
  prefRestaurant: number;

  @ApiPropertyOptional({ description: '숙박 선호도' })
  @Column('decimal', { precision: 3, scale: 2, default: 0.5 })
  prefAccommodation: number;

  @ApiPropertyOptional({ description: '쇼핑 선호도' })
  @Column('decimal', { precision: 3, scale: 2, default: 0.5 })
  prefShopping: number;

  @ApiPropertyOptional({ description: '문화/관광 선호도' })
  @Column('decimal', { precision: 3, scale: 2, default: 0.5 })
  prefCulture: number;

  @ApiPropertyOptional({ description: '엔터테인먼트 선호도' })
  @Column('decimal', { precision: 3, scale: 2, default: 0.5 })
  prefEntertainment: number;

  // ============ 분위기 선호도 (0.0 ~ 1.0) ============

  @ApiPropertyOptional({ description: '조용한 분위기 선호도' })
  @Column('decimal', { precision: 3, scale: 2, default: 0.5 })
  prefQuiet: number;

  @ApiPropertyOptional({ description: '활기찬 분위기 선호도' })
  @Column('decimal', { precision: 3, scale: 2, default: 0.5 })
  prefLively: number;

  @ApiPropertyOptional({ description: '로맨틱 분위기 선호도' })
  @Column('decimal', { precision: 3, scale: 2, default: 0.5 })
  prefRomantic: number;

  @ApiPropertyOptional({ description: '모던/세련된 분위기 선호도' })
  @Column('decimal', { precision: 3, scale: 2, default: 0.5 })
  prefModern: number;

  @ApiPropertyOptional({ description: '전통적인 분위기 선호도' })
  @Column('decimal', { precision: 3, scale: 2, default: 0.5 })
  prefTraditional: number;

  // ============ 가격대 선호도 ============

  @ApiPropertyOptional({ description: '선호 최소 가격대 (원)' })
  @Column({ nullable: true })
  prefPriceMin?: number;

  @ApiPropertyOptional({ description: '선호 최대 가격대 (원)' })
  @Column({ nullable: true })
  prefPriceMax?: number;

  @ApiPropertyOptional({ description: '가성비 중시도 (0~1)' })
  @Column('decimal', { precision: 3, scale: 2, default: 0.5 })
  prefValueForMoney: number;

  // ============ 평점 선호도 ============

  @ApiPropertyOptional({ description: '선호 최소 평점' })
  @Column('decimal', { precision: 2, scale: 1, default: 4.0 })
  prefMinRating: number;

  @ApiPropertyOptional({ description: '평점 중시도 (0~1)' })
  @Column('decimal', { precision: 3, scale: 2, default: 0.7 })
  prefRatingImportance: number;

  // ============ 위치 선호도 ============

  @ApiPropertyOptional({ 
    description: '자주 방문하는 지역들 (JSON)',
    example: [{ area: '강남', count: 15 }, { area: '홍대', count: 10 }]
  })
  @Column('jsonb', { nullable: true })
  frequentAreas?: { area: string; count: number; lastVisit?: Date }[];

  @ApiPropertyOptional({ description: '선호 검색 반경 (미터)' })
  @Column({ default: 2000 })
  prefSearchRadius: number;

  // ============ 시간대 선호도 ============

  @ApiPropertyOptional({ 
    description: '주로 검색하는 시간대 (JSON)',
    example: { morning: 0.1, lunch: 0.3, afternoon: 0.2, dinner: 0.3, night: 0.1 }
  })
  @Column('jsonb', { nullable: true })
  timePreference?: {
    morning?: number;   // 06~11
    lunch?: number;     // 11~14
    afternoon?: number; // 14~17
    dinner?: number;    // 17~21
    night?: number;     // 21~06
  };

  @ApiPropertyOptional({ 
    description: '주로 방문하는 요일 (JSON)',
    example: { weekday: 0.6, weekend: 0.4 }
  })
  @Column('jsonb', { nullable: true })
  dayPreference?: {
    weekday?: number;
    weekend?: number;
  };

  // ============ 특수 선호도 ============

  @ApiPropertyOptional({ description: '주차 필요도 (0~1)' })
  @Column('decimal', { precision: 3, scale: 2, default: 0.3 })
  needParking: number;

  @ApiPropertyOptional({ description: '혼밥 선호도 (0~1)' })
  @Column('decimal', { precision: 3, scale: 2, default: 0.5 })
  prefSolo: number;

  @ApiPropertyOptional({ description: '단체 모임 선호도 (0~1)' })
  @Column('decimal', { precision: 3, scale: 2, default: 0.5 })
  prefGroup: number;

  @ApiPropertyOptional({ description: '애견 동반 선호도 (0~1)' })
  @Column('decimal', { precision: 3, scale: 2, default: 0.2 })
  prefPetFriendly: number;

  // ============ 학습 메타데이터 ============

  @ApiPropertyOptional({ 
    description: '학습된 키워드들 (가중치 포함)',
    example: { '분위기좋은': 0.8, '조용한': 0.7, '데이트': 0.6 }
  })
  @Column('jsonb', { nullable: true })
  learnedKeywords?: Record<string, number>;

  @ApiProperty({ description: '총 검색 횟수' })
  @Column({ default: 0 })
  totalSearches: number;

  @ApiProperty({ description: '총 방문 피드백 수' })
  @Column({ default: 0 })
  totalFeedbacks: number;

  @ApiProperty({ description: '마지막 학습 일시' })
  @Column({ nullable: true })
  lastLearnedAt?: Date;

  @ApiProperty({ description: '선호도 계산 버전 (알고리즘 버전)' })
  @Column({ default: 1 })
  algorithmVersion: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

