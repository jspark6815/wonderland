import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToOne,
  OneToMany,
} from 'typeorm';
import { UserSettings } from './user-settings.entity';
import { Favorite } from './favorite.entity';

/**
 * 사용자 역할
 */
export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

/**
 * 사용자 엔티티
 */
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  email: string;

  @Column()
  password: string;

  @Column({ nullable: true })
  name?: string;

  // 프로필 확장 필드
  @Column({ nullable: true })
  profileImage?: string;

  @Column({ nullable: true, length: 200 })
  bio?: string; // 자기소개

  @Column({ nullable: true })
  phone?: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  lastLoginAt?: Date;

  @Column({ nullable: true })
  refreshToken?: string;

  // 관계 설정
  @OneToOne(() => UserSettings, (settings) => settings.user)
  settings: UserSettings;

  @OneToMany(() => Favorite, (favorite) => favorite.user)
  favorites: Favorite[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

