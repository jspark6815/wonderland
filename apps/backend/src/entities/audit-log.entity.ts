import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 감사 로그 액션 타입
 */
export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  SOFT_DELETE = 'SOFT_DELETE',
  RESTORE = 'RESTORE',
  VIEW = 'VIEW',
  SEARCH = 'SEARCH',
  FAVORITE = 'FAVORITE',
  UNFAVORITE = 'UNFAVORITE',
  FEEDBACK = 'FEEDBACK',
}

/**
 * 감사 로그 엔티티
 * 모든 중요한 데이터 변경 및 접근 이력을 추적
 * - GDPR/개인정보보호 대응
 * - 데이터 무결성 검증
 * - 사용자 행동 분석 (AI 추천 개선)
 */
@Entity('audit_logs')
@Index(['entityType', 'entityId'])
@Index(['userId', 'createdAt'])
@Index(['action', 'createdAt'])
@Index(['createdAt'])
export class AuditLog {
  @ApiProperty({ description: '로그 ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: '액션 타입', enum: AuditAction })
  @Column({ type: 'enum', enum: AuditAction })
  action: AuditAction;

  @ApiProperty({ description: '대상 엔티티 타입', example: 'Place' })
  @Column()
  entityType: string;

  @ApiProperty({ description: '대상 엔티티 ID' })
  @Column()
  entityId: string;

  @ApiPropertyOptional({ description: '수행한 사용자 ID (없으면 시스템)' })
  @Column({ nullable: true })
  userId?: string;

  @ApiPropertyOptional({ description: '변경 전 데이터 (JSON)' })
  @Column('jsonb', { nullable: true })
  oldData?: Record<string, unknown>;

  @ApiPropertyOptional({ description: '변경 후 데이터 (JSON)' })
  @Column('jsonb', { nullable: true })
  newData?: Record<string, unknown>;

  @ApiPropertyOptional({ description: '변경된 필드 목록' })
  @Column('simple-array', { nullable: true })
  changedFields?: string[];

  @ApiPropertyOptional({ description: 'IP 주소' })
  @Column({ nullable: true })
  ipAddress?: string;

  @ApiPropertyOptional({ description: 'User Agent' })
  @Column({ nullable: true })
  userAgent?: string;

  @ApiPropertyOptional({ description: '추가 메타데이터' })
  @Column('jsonb', { nullable: true })
  metadata?: Record<string, unknown>;

  @ApiProperty({ description: '생성일시' })
  @CreateDateColumn()
  createdAt: Date;
}

