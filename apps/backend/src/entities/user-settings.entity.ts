import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

/**
 * 사용자 설정 엔티티
 * 각 사용자의 개인 설정을 저장
 */
@Entity('user_settings')
export class UserSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { unique: true })
  userId: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  // 알림 설정
  @Column({ default: true })
  notificationEnabled: boolean;

  @Column({ default: true })
  emailNotification: boolean;

  @Column({ default: true })
  pushNotification: boolean;

  // UI 설정
  @Column({ default: false })
  darkMode: boolean;

  @Column({ default: 'ko' })
  language: string;

  // 검색/추천 설정
  @Column({ default: true })
  saveSearchHistory: boolean;

  @Column({ default: true })
  personalizedRecommendation: boolean;

  // 선호 카테고리 (JSON 배열)
  @Column('simple-array', { nullable: true })
  preferredCategories?: string[];

  // 기본 검색 반경 (미터)
  @Column({ default: 1000 })
  defaultSearchRadius: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

