import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { UserSettings } from '../../entities/user-settings.entity';
import { Favorite } from '../../entities/favorite.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { AddFavoriteDto, UpdateFavoriteDto } from './dto/favorite.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserSettings)
    private readonly settingsRepository: Repository<UserSettings>,
    @InjectRepository(Favorite)
    private readonly favoriteRepository: Repository<Favorite>,
  ) {}

  // ==================== 프로필 ====================

  /**
   * 사용자 프로필 조회
   */
  async getProfile(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'email', 'name', 'profileImage', 'bio', 'phone', 'role', 'createdAt'],
    });

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    return user;
  }

  /**
   * 프로필 수정
   */
  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    Object.assign(user, dto);
    await this.userRepository.save(user);

    this.logger.log(`Profile updated for user ${userId}`);
    
    return this.getProfile(userId);
  }

  // ==================== 설정 ====================

  /**
   * 사용자 설정 조회 (없으면 기본값 생성)
   */
  async getSettings(userId: string) {
    let settings = await this.settingsRepository.findOne({
      where: { userId },
    });

    // 설정이 없으면 기본값으로 생성
    if (!settings) {
      settings = this.settingsRepository.create({ userId });
      await this.settingsRepository.save(settings);
      this.logger.log(`Default settings created for user ${userId}`);
    }

    return settings;
  }

  /**
   * 설정 수정
   */
  async updateSettings(userId: string, dto: UpdateSettingsDto) {
    let settings = await this.settingsRepository.findOne({
      where: { userId },
    });

    if (!settings) {
      // 없으면 새로 생성
      settings = this.settingsRepository.create({ userId, ...dto });
    } else {
      Object.assign(settings, dto);
    }

    await this.settingsRepository.save(settings);
    this.logger.log(`Settings updated for user ${userId}`);

    return settings;
  }

  // ==================== 즐겨찾기 ====================

  /**
   * 즐겨찾기 목록 조회
   */
  async getFavorites(userId: string, folder?: string) {
    const qb = this.favoriteRepository
      .createQueryBuilder('favorite')
      .leftJoinAndSelect('favorite.place', 'place')
      .where('favorite.userId = :userId', { userId })
      .orderBy('favorite.createdAt', 'DESC');

    if (folder) {
      qb.andWhere('favorite.folder = :folder', { folder });
    }

    const favorites = await qb.getMany();

    return favorites.map((f) => ({
      id: f.id,
      placeId: f.placeId,
      memo: f.memo,
      folder: f.folder,
      createdAt: f.createdAt,
      place: f.place ? {
        id: f.place.id,
        name: f.place.name,
        category: f.place.category,
        address: f.place.address,
        rating: f.place.rating,
        images: f.place.images,
        latitude: f.place.latitude,
        longitude: f.place.longitude,
      } : null,
    }));
  }

  /**
   * 즐겨찾기 폴더 목록 조회
   */
  async getFavoriteFolders(userId: string) {
    const result = await this.favoriteRepository
      .createQueryBuilder('favorite')
      .select('favorite.folder', 'folder')
      .addSelect('COUNT(*)', 'count')
      .where('favorite.userId = :userId', { userId })
      .andWhere('favorite.folder IS NOT NULL')
      .groupBy('favorite.folder')
      .getRawMany();

    return result;
  }

  /**
   * 즐겨찾기 추가
   */
  async addFavorite(userId: string, dto: AddFavoriteDto) {
    // 중복 확인
    const existing = await this.favoriteRepository.findOne({
      where: { userId, placeId: dto.placeId },
    });

    if (existing) {
      throw new ConflictException('이미 즐겨찾기에 추가된 장소입니다.');
    }

    const favorite = this.favoriteRepository.create({
      userId,
      placeId: dto.placeId,
      memo: dto.memo,
      folder: dto.folder,
    });

    await this.favoriteRepository.save(favorite);
    this.logger.log(`Favorite added: user=${userId}, place=${dto.placeId}`);

    return favorite;
  }

  /**
   * 즐겨찾기 수정 (메모/폴더)
   */
  async updateFavorite(userId: string, favoriteId: string, dto: UpdateFavoriteDto) {
    const favorite = await this.favoriteRepository.findOne({
      where: { id: favoriteId, userId },
    });

    if (!favorite) {
      throw new NotFoundException('즐겨찾기를 찾을 수 없습니다.');
    }

    Object.assign(favorite, dto);
    await this.favoriteRepository.save(favorite);

    return favorite;
  }

  /**
   * 즐겨찾기 삭제
   */
  async removeFavorite(userId: string, favoriteId: string) {
    const favorite = await this.favoriteRepository.findOne({
      where: { id: favoriteId, userId },
    });

    if (!favorite) {
      throw new NotFoundException('즐겨찾기를 찾을 수 없습니다.');
    }

    await this.favoriteRepository.remove(favorite);
    this.logger.log(`Favorite removed: user=${userId}, id=${favoriteId}`);

    return { success: true };
  }

  /**
   * 특정 장소가 즐겨찾기인지 확인
   */
  async isFavorite(userId: string, placeId: string): Promise<boolean> {
    const count = await this.favoriteRepository.count({
      where: { userId, placeId },
    });
    return count > 0;
  }

  /**
   * 장소 ID로 즐겨찾기 삭제 (토글용)
   */
  async removeFavoriteByPlaceId(userId: string, placeId: string) {
    const favorite = await this.favoriteRepository.findOne({
      where: { userId, placeId },
    });

    if (!favorite) {
      throw new NotFoundException('즐겨찾기를 찾을 수 없습니다.');
    }

    await this.favoriteRepository.remove(favorite);
    this.logger.log(`Favorite removed by placeId: user=${userId}, place=${placeId}`);

    return { success: true };
  }
}

