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
import { User } from './user.entity';
import { Place, PlaceCategory } from './place.entity';

/**
 * 검색 기록 엔티티
 * - 사용자별 장소 검색 기록 저장
 * - 로그인 시 최근 검색 내역 표시
 * - 장소 상세보기 클릭 시 placeId 저장 (피드백 추적용)
 */
@Entity('search_history')
@Index(['userId', 'createdAt'])
@Index(['userId', 'placeId'])
export class SearchHistory {
  @ApiProperty({ description: '검색 기록 ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: '사용자 ID' })
  @Column()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ApiProperty({ description: '검색어', example: '강남역 카페' })
  @Column()
  query: string;

  @ApiPropertyOptional({ description: '카테고리 필터', enum: PlaceCategory })
  @Column({ type: 'enum', enum: PlaceCategory, nullable: true })
  category?: PlaceCategory;

  @ApiPropertyOptional({ description: '클릭한 장소 ID (상세보기 클릭 시 저장)' })
  @Column('uuid', { nullable: true })
  placeId?: string;

  @ManyToOne(() => Place, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'placeId' })
  place?: Place;

  @ApiPropertyOptional({ description: '검색 위치 - 위도' })
  @Column('decimal', { precision: 10, scale: 8, nullable: true })
  latitude?: number;

  @ApiPropertyOptional({ description: '검색 위치 - 경도' })
  @Column('decimal', { precision: 11, scale: 8, nullable: true })
  longitude?: number;

  @ApiProperty({ description: '검색 결과 수', default: 0 })
  @Column({ default: 0 })
  resultCount: number;

  @ApiProperty({ description: '검색 일시' })
  @CreateDateColumn()
  createdAt: Date;
}

