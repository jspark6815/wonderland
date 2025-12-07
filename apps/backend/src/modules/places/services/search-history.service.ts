import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SearchHistory } from '../../../entities/search-history.entity';
import { PlaceCategory } from '../../../entities/place.entity';

/**
 * 검색 기록 저장 파라미터
 */
interface SaveSearchParams {
  userId: string;
  query: string;
  category?: PlaceCategory;
  latitude?: number;
  longitude?: number;
  resultCount: number;
}

/**
 * 검색 기록 서비스
 * - 사용자별 검색 기록 저장/조회
 * - 중복 검색어 처리
 */
@Injectable()
export class SearchHistoryService {
  private readonly logger = new Logger(SearchHistoryService.name);

  constructor(
    @InjectRepository(SearchHistory)
    private readonly searchHistoryRepository: Repository<SearchHistory>,
  ) {}

  /**
   * 검색 기록 저장
   * - 같은 검색어가 있으면 기존 기록 업데이트
   */
  async saveSearch(params: SaveSearchParams): Promise<SearchHistory> {
    const { userId, query, category, latitude, longitude, resultCount } = params;

    // 같은 사용자의 같은 검색어 찾기 (최근 24시간 내)
    const existingSearch = await this.searchHistoryRepository.findOne({
      where: {
        userId,
        query,
        category: category ?? undefined,
      },
      order: { createdAt: 'DESC' },
    });

    // 24시간 내 같은 검색이면 업데이트
    if (existingSearch) {
      const hoursDiff = (Date.now() - existingSearch.createdAt.getTime()) / (1000 * 60 * 60);
      if (hoursDiff < 24) {
        existingSearch.resultCount = resultCount;
        existingSearch.latitude = latitude;
        existingSearch.longitude = longitude;
        return this.searchHistoryRepository.save(existingSearch);
      }
    }

    // 새 검색 기록 생성
    const searchHistory = this.searchHistoryRepository.create({
      userId,
      query,
      category,
      latitude,
      longitude,
      resultCount,
    });

    return this.searchHistoryRepository.save(searchHistory);
  }

  /**
   * 사용자의 최근 검색 기록 조회
   */
  async getRecentSearches(userId: string, limit: number = 10): Promise<SearchHistory[]> {
    return this.searchHistoryRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * 사용자의 마지막 검색 기록 조회
   */
  async getLastSearch(userId: string): Promise<SearchHistory | null> {
    return this.searchHistoryRepository.findOne({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 특정 검색 기록 삭제
   */
  async deleteSearch(userId: string, searchId: string): Promise<boolean> {
    const result = await this.searchHistoryRepository.delete({
      id: searchId,
      userId,
    });
    return (result.affected ?? 0) > 0;
  }

  /**
   * 사용자의 모든 검색 기록 삭제
   */
  async clearHistory(userId: string): Promise<number> {
    const result = await this.searchHistoryRepository.delete({ userId });
    return result.affected ?? 0;
  }
}

