import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * API 요청 로그 엔티티
 * 모든 HTTP 요청/응답을 기록
 */
@Entity('request_logs')
@Index(['createdAt'])
@Index(['method', 'statusCode'])
@Index(['ip'])
export class RequestLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50 })
  requestId: string;

  @Column({ length: 10 })
  method: string;

  @Column({ length: 2048 })
  url: string;

  @Column({ nullable: true, length: 500 })
  path: string;

  @Column({ type: 'int' })
  statusCode: number;

  @Column({ type: 'int' })
  duration: number;

  @Column({ nullable: true, length: 50 })
  ip: string;

  @Column({ nullable: true, length: 500 })
  userAgent: string;

  @Column({ type: 'jsonb', nullable: true })
  requestBody: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true })
  queryParams: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true })
  responseBody: Record<string, unknown>;

  @Column({ nullable: true, length: 1000 })
  errorMessage: string;

  @Column({ nullable: true, type: 'text' })
  errorStack: string;

  @Column({ default: false })
  isError: boolean;

  @Column({ default: false })
  isSlow: boolean;

  @CreateDateColumn()
  createdAt: Date;
}

