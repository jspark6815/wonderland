import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { VisitFeedback } from '../../entities/visit-feedback.entity';
import { Place } from '../../entities/place.entity';
import { SearchHistory } from '../../entities/search-history.entity';
import { CreateVisitFeedbackDto, PendingFeedbackDto } from './dto/create-feedback.dto';

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);
  
  // 피드백 요청 가능 시간 (검색 후 5분)
  private readonly FEEDBACK_DELAY_MINUTES = 5;

  constructor(
    @InjectRepository(VisitFeedback)
    private readonly feedbackRepository: Repository<VisitFeedback>,
    @InjectRepository(Place)
    private readonly placeRepository: Repository<Place>,
    @InjectRepository(SearchHistory)
    private readonly searchHistoryRepository: Repository<SearchHistory>,
  ) {}

  /**
   * 방문 피드백 저장
   */
  async createFeedback(userId: string, dto: CreateVisitFeedbackDto): Promise<VisitFeedback> {
    // 장소 존재 확인
    const place = await this.placeRepository.findOne({ where: { id: dto.placeId } });
    if (!place) {
      throw new NotFoundException('장소를 찾을 수 없습니다');
    }

    // 피드백 저장
    const feedback = this.feedbackRepository.create({
      userId,
      ...dto,
      visitedAt: new Date(),
    });

    const saved = await this.feedbackRepository.save(feedback);
    this.logger.log(`Feedback created: ${saved.id} for place ${dto.placeId} by user ${userId}`);

    // 피드백 데이터로 장소 정보 업데이트 (비동기)
    this.updatePlaceWithFeedback(dto.placeId).catch(err => 
      this.logger.error('Failed to update place with feedback:', err)
    );

    return saved;
  }

  /**
   * 피드백 데이터 집계하여 장소 정보 업데이트
   */
  private async updatePlaceWithFeedback(placeId: string): Promise<void> {
    const feedbacks = await this.feedbackRepository.find({
      where: { placeId, visited: true },
    });

    if (feedbacks.length < 2) {
      // 최소 2개 이상의 피드백이 있어야 업데이트
      return;
    }

    const place = await this.placeRepository.findOne({ where: { id: placeId } });
    if (!place) return;

    // 피드백 집계
    const aggregated = this.aggregateFeedbacks(feedbacks);

    // 장소 정보 업데이트
    const updateData: Partial<Place> = {};

    // 시설 정보 (50% 이상 동의 시 true)
    if (aggregated.hasParking !== null) {
      updateData.specialInfo = {
        ...place.specialInfo,
        parking: aggregated.hasParking ? aggregated.parkingInfo || '주차가능' : undefined,
      };
    }

    // 특성 정보
    const features: string[] = place.features || [];
    const atmosphere: string[] = place.atmosphere || [];
    const recommendFor: string[] = place.recommendFor || [];

    if (aggregated.hasWifi) features.push('WiFi');
    if (aggregated.hasPowerOutlets) features.push('콘센트');
    if (aggregated.hasGroupSeating) features.push('단체석');
    if (aggregated.hasPrivateRoom) features.push('개인룸');
    if (aggregated.hasKidsZone) features.push('키즈존');
    if (aggregated.petFriendly) features.push('애견동반');
    if (aggregated.goodDessert) features.push('디저트맛집');
    if (aggregated.goodCoffee) features.push('커피맛집');

    if (aggregated.goodForSolo) recommendFor.push('혼자');
    if (aggregated.goodForDate) recommendFor.push('연인');
    if (aggregated.goodForWork) recommendFor.push('작업');

    // 분위기 태그 병합
    if (aggregated.atmosphereTags.length > 0) {
      atmosphere.push(...aggregated.atmosphereTags);
    }

    // 중복 제거
    updateData.features = [...new Set(features)];
    updateData.atmosphere = [...new Set(atmosphere)];
    updateData.recommendFor = [...new Set(recommendFor)];

    // 소음 수준 기반 분위기 추가
    if (aggregated.avgNoiseLevel !== null) {
      if (aggregated.avgNoiseLevel <= 2) {
        updateData.atmosphere = [...new Set([...updateData.atmosphere!, '조용한'])];
      } else if (aggregated.avgNoiseLevel >= 4) {
        updateData.atmosphere = [...new Set([...updateData.atmosphere!, '활기찬'])];
      }
    }

    await this.placeRepository.update(placeId, updateData);
    this.logger.log(`Place ${placeId} updated with ${feedbacks.length} feedbacks`);
  }

  /**
   * 피드백 집계
   */
  private aggregateFeedbacks(feedbacks: VisitFeedback[]): {
    hasParking: boolean | null;
    parkingInfo: string | undefined;
    hasWifi: boolean;
    hasPowerOutlets: boolean;
    petFriendly: boolean;
    hasGroupSeating: boolean;
    hasPrivateRoom: boolean;
    hasKidsZone: boolean;
    goodForSolo: boolean;
    goodForDate: boolean;
    goodForWork: boolean;
    goodDessert: boolean;
    goodCoffee: boolean;
    atmosphereTags: string[];
    avgNoiseLevel: number | null;
  } {
    const total = feedbacks.length;
    const threshold = 0.5; // 50% 이상 동의

    const count = (field: keyof VisitFeedback) => 
      feedbacks.filter(f => f[field] === true).length;

    const avgField = (field: keyof VisitFeedback) => {
      const values = feedbacks.filter(f => f[field] !== null && f[field] !== undefined).map(f => f[field] as number);
      return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null;
    };

    // 분위기 태그 집계 (2번 이상 언급된 것만)
    const tagCounts: Record<string, number> = {};
    feedbacks.forEach(f => {
      f.atmosphereTags?.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });
    const atmosphereTags = Object.entries(tagCounts)
      .filter(([_, count]) => count >= 2)
      .map(([tag]) => tag);

    // 주차 정보
    const parkingFeedbacks = feedbacks.filter(f => f.parkingInfo);
    const mostCommonParkingInfo = parkingFeedbacks.length > 0 
      ? parkingFeedbacks[0].parkingInfo 
      : undefined;

    return {
      hasParking: count('hasParking') / total >= threshold ? true : count('hasParking') === 0 ? null : false,
      parkingInfo: mostCommonParkingInfo,
      hasWifi: count('hasWifi') / total >= threshold,
      hasPowerOutlets: count('hasPowerOutlets') / total >= threshold,
      petFriendly: count('petFriendly') / total >= threshold,
      hasGroupSeating: count('hasGroupSeating') / total >= threshold,
      hasPrivateRoom: count('hasPrivateRoom') / total >= threshold,
      hasKidsZone: count('hasKidsZone') / total >= threshold,
      goodForSolo: count('goodForSolo') / total >= threshold,
      goodForDate: count('goodForDate') / total >= threshold,
      goodForWork: count('goodForWork') / total >= threshold,
      goodDessert: count('goodDessert') / total >= threshold,
      goodCoffee: count('goodCoffee') / total >= threshold,
      atmosphereTags,
      avgNoiseLevel: avgField('noiseLevel'),
    };
  }

  /**
   * 피드백 요청 대기 목록 조회 (5분 이상 지난 검색)
   */
  async getPendingFeedbacks(userId: string): Promise<PendingFeedbackDto[]> {
    const feedbackAvailableTime = new Date();
    feedbackAvailableTime.setMinutes(feedbackAvailableTime.getMinutes() - this.FEEDBACK_DELAY_MINUTES);

    // 5분 이상 지난 검색 중 피드백이 없는 것
    const searches = await this.searchHistoryRepository
      .createQueryBuilder('sh')
      .leftJoin('places', 'p', 'p.id = sh.placeId')
      .leftJoin('visit_feedbacks', 'vf', 'vf.searchHistoryId = sh.id AND vf.userId = :userId', { userId })
      .where('sh.userId = :userId', { userId })
      .andWhere('sh.createdAt < :time', { time: feedbackAvailableTime })
      .andWhere('sh.placeId IS NOT NULL')
      .andWhere('vf.id IS NULL') // 피드백이 없는 것만
      .orderBy('sh.createdAt', 'DESC')
      .limit(5)
      .select(['sh.id', 'sh.placeId', 'sh.query', 'sh.createdAt', 'p.name'])
      .getRawMany();

    return searches.map(s => ({
      placeId: s.sh_placeId,
      placeName: s.p_name || s.sh_query,
      searchHistoryId: s.sh_id,
      searchedAt: s.sh_createdAt,
      feedbackAvailableAt: new Date(new Date(s.sh_createdAt).getTime() + this.FEEDBACK_DELAY_MINUTES * 60000),
    }));
  }

  /**
   * 장소별 피드백 요약 조회
   */
  async getPlaceFeedbackSummary(placeId: string): Promise<{
    totalFeedbacks: number;
    avgRating: number | null;
    features: Record<string, number>;
    recentComments: string[];
  }> {
    const feedbacks = await this.feedbackRepository.find({
      where: { placeId, visited: true },
      order: { createdAt: 'DESC' },
      take: 50,
    });

    if (feedbacks.length === 0) {
      return {
        totalFeedbacks: 0,
        avgRating: null,
        features: {},
        recentComments: [],
      };
    }

    // 평균 평점
    const ratings = feedbacks.filter(f => f.overallRating).map(f => f.overallRating!);
    const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;

    // 특성별 카운트
    const features: Record<string, number> = {};
    const featureFields = ['hasParking', 'hasWifi', 'hasPowerOutlets', 'petFriendly', 'goodForSolo', 'goodForDate', 'goodForWork', 'goodDessert', 'goodCoffee'] as const;
    
    featureFields.forEach(field => {
      const count = feedbacks.filter(f => f[field] === true).length;
      if (count > 0) {
        features[field] = count;
      }
    });

    // 최근 코멘트
    const recentComments = feedbacks
      .filter(f => f.comment)
      .slice(0, 5)
      .map(f => f.comment!);

    return {
      totalFeedbacks: feedbacks.length,
      avgRating: avgRating ? Math.round(avgRating * 10) / 10 : null,
      features,
      recentComments,
    };
  }
}



