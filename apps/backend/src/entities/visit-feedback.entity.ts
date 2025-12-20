import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Place } from './place.entity';
import { User } from './user.entity';

/**
 * 방문 피드백 엔티티
 * 사용자가 검색 후 실제 방문했을 때 수집하는 정보
 */
@Entity('visit_feedbacks')
@Index(['userId', 'placeId'])
@Index(['placeId'])
export class VisitFeedback {
  @ApiProperty({ description: '피드백 ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: '사용자 ID' })
  @Column()
  userId: string;

  @ApiProperty({ description: '장소 ID' })
  @Column()
  placeId: string;

  @ApiProperty({ description: '검색 기록 ID (어떤 검색에서 방문했는지)' })
  @Column({ nullable: true })
  searchHistoryId?: string;

  // ============ 핵심 피드백 정보 ============

  @ApiProperty({ description: '실제 방문 여부' })
  @Column({ default: true })
  visited: boolean;

  @ApiPropertyOptional({ description: '전체 만족도 (1-5)' })
  @Column({ type: 'int', nullable: true })
  overallRating?: number;

  @ApiPropertyOptional({ description: '재방문 의향' })
  @Column({ nullable: true })
  wouldRevisit?: boolean;

  @ApiPropertyOptional({ description: '추천 의향' })
  @Column({ nullable: true })
  wouldRecommend?: boolean;

  // ============ 시설 정보 ============

  @ApiPropertyOptional({ description: '주차 가능 여부' })
  @Column({ nullable: true })
  hasParking?: boolean;

  @ApiPropertyOptional({ description: '주차 정보 (무료/유료/발렛 등)' })
  @Column({ nullable: true })
  parkingInfo?: string;

  @ApiPropertyOptional({ description: 'WiFi 가능 여부' })
  @Column({ nullable: true })
  hasWifi?: boolean;

  @ApiPropertyOptional({ description: '콘센트 사용 가능' })
  @Column({ nullable: true })
  hasPowerOutlets?: boolean;

  @ApiPropertyOptional({ description: '애견 동반 가능' })
  @Column({ nullable: true })
  petFriendly?: boolean;

  @ApiPropertyOptional({ description: '단체석 유무' })
  @Column({ nullable: true })
  hasGroupSeating?: boolean;

  @ApiPropertyOptional({ description: '개인실/룸 유무' })
  @Column({ nullable: true })
  hasPrivateRoom?: boolean;

  @ApiPropertyOptional({ description: '키즈존 유무' })
  @Column({ nullable: true })
  hasKidsZone?: boolean;

  // ============ 분위기/특성 ============

  @ApiPropertyOptional({ 
    description: '분위기 태그',
    type: [String],
    example: ['조용함', '로맨틱', '활기참']
  })
  @Column('simple-array', { nullable: true })
  atmosphereTags?: string[];

  @ApiPropertyOptional({ description: '소음 수준 (1: 매우조용 ~ 5: 매우시끄러움)' })
  @Column({ type: 'int', nullable: true })
  noiseLevel?: number;

  @ApiPropertyOptional({ description: '혼밥하기 좋은지' })
  @Column({ nullable: true })
  goodForSolo?: boolean;

  @ApiPropertyOptional({ description: '데이트하기 좋은지' })
  @Column({ nullable: true })
  goodForDate?: boolean;

  @ApiPropertyOptional({ description: '작업/공부하기 좋은지' })
  @Column({ nullable: true })
  goodForWork?: boolean;

  // ============ 음식/메뉴 (카페/음식점용) ============

  @ApiPropertyOptional({ description: '디저트가 맛있는지 (카페)' })
  @Column({ nullable: true })
  goodDessert?: boolean;

  @ApiPropertyOptional({ description: '커피가 맛있는지 (카페)' })
  @Column({ nullable: true })
  goodCoffee?: boolean;

  @ApiPropertyOptional({ description: '음식 맛 평가 (1-5)' })
  @Column({ type: 'int', nullable: true })
  foodRating?: number;

  @ApiPropertyOptional({ description: '가격 대비 만족도 (1-5)' })
  @Column({ type: 'int', nullable: true })
  valueForMoney?: number;

  // ============ 기타 ============

  @ApiPropertyOptional({ description: '대기 시간 (분)' })
  @Column({ type: 'int', nullable: true })
  waitTimeMinutes?: number;

  @ApiPropertyOptional({ description: '추가 코멘트' })
  @Column({ type: 'text', nullable: true })
  comment?: string;

  @ApiPropertyOptional({ 
    description: '사용자가 추가한 태그',
    type: [String]
  })
  @Column('simple-array', { nullable: true })
  userTags?: string[];

  // ============ 메타 정보 ============

  @ApiProperty({ description: '피드백 생성일시' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiPropertyOptional({ description: '방문 일시' })
  @Column({ nullable: true })
  visitedAt?: Date;

  // Relations
  @ManyToOne(() => Place, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'placeId' })
  place?: Place;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user?: User;
}



