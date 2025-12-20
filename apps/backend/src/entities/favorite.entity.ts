import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { User } from './user.entity';
import { Place } from './place.entity';

/**
 * 즐겨찾기 엔티티
 * 사용자가 장소를 북마크/즐겨찾기 할 수 있음
 */
@Entity('favorites')
@Unique(['userId', 'placeId']) // 같은 장소를 중복 즐겨찾기 방지
@Index(['userId', 'createdAt']) // 사용자별 최신순 조회 최적화
export class Favorite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  userId: string;

  @Column('uuid')
  @Index()
  placeId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Place, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'placeId' })
  place: Place;

  @Column({ nullable: true })
  memo?: string; // 사용자가 남긴 메모

  @Column({ nullable: true })
  folder?: string; // 폴더/그룹 분류 (예: "데이트", "맛집", "카페")

  @CreateDateColumn()
  createdAt: Date;
}

