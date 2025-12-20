import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { createHash } from 'crypto';

/**
 * AI 쿼리 캐시 항목
 */
interface AiCacheEntry<T> {
  data: T;
  expiry: number;
  hitCount: number;
  createdAt: number;
}

/**
 * 캐시 통계
 */
interface CacheStats {
  hits: number;
  misses: number;
  totalItems: number;
  totalTokensSaved: number;
}

/**
 * AI 쿼리 캐시 서비스
 * - 동일한 쿼리에 대한 LLM 호출 방지 (토큰 절약)
 * - 컨텍스트 포함 캐시 키 생성
 * - TTL 기반 자동 만료
 */
@Injectable()
export class AiCacheService implements OnModuleDestroy {
  private readonly logger = new Logger(AiCacheService.name);
  private cache = new Map<string, AiCacheEntry<unknown>>();
  private cleanupTimer: NodeJS.Timeout | null = null;
  
  // 캐시 통계
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    totalItems: 0,
    totalTokensSaved: 0,
  };

  // 설정
  private readonly config = {
    maxItems: parseInt(process.env.AI_CACHE_MAX_ITEMS || '500', 10),
    defaultTtl: parseInt(process.env.AI_CACHE_TTL || '300', 10), // 5분
    cleanupInterval: 60000, // 1분마다 만료 항목 정리
    estimatedTokensPerQuery: 500, // 평균 토큰 수 추정
  };

  constructor() {
    this.startCleanupTimer();
    this.logger.log(`AI Cache initialized (maxItems: ${this.config.maxItems}, TTL: ${this.config.defaultTtl}s)`);
  }

  onModuleDestroy(): void {
    this.stopCleanupTimer();
    this.cache.clear();
  }

  /**
   * 캐시 키 생성
   * - 쿼리 + 컨텍스트 조합으로 고유 키 생성
   * - 정규화하여 유사한 쿼리도 같은 키로 매핑
   */
  generateKey(query: string, context?: Record<string, unknown>): string {
    // 쿼리 정규화 (소문자, 공백 정리, 특수문자 제거)
    const normalizedQuery = this.normalizeQuery(query);
    
    // 컨텍스트 정규화 (null/undefined 제거)
    const normalizedContext = context 
      ? this.normalizeContext(context)
      : {};
    
    const keyData = JSON.stringify({
      q: normalizedQuery,
      c: normalizedContext,
    });
    
    const hash = createHash('sha256')
      .update(keyData)
      .digest('hex')
      .substring(0, 16);
    
    return `ai:interpret:${hash}`;
  }

  /**
   * 캐시에서 조회
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // 만료 체크
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // 캐시 히트
    entry.hitCount++;
    this.stats.hits++;
    this.stats.totalTokensSaved += this.config.estimatedTokensPerQuery;
    
    this.logger.debug(`Cache HIT: ${key} (hitCount: ${entry.hitCount})`);
    
    return entry.data as T;
  }

  /**
   * 캐시에 저장
   */
  set<T>(key: string, data: T, ttl?: number): void {
    // 용량 초과 시 가장 오래된 항목 제거
    if (this.cache.size >= this.config.maxItems) {
      this.evictOldest();
    }

    const entry: AiCacheEntry<T> = {
      data,
      expiry: Date.now() + ((ttl ?? this.config.defaultTtl) * 1000),
      hitCount: 0,
      createdAt: Date.now(),
    };

    this.cache.set(key, entry);
    this.stats.totalItems = this.cache.size;
    
    this.logger.debug(`Cache SET: ${key} (TTL: ${ttl ?? this.config.defaultTtl}s)`);
  }

  /**
   * 캐시 삭제
   */
  delete(key: string): void {
    this.cache.delete(key);
    this.stats.totalItems = this.cache.size;
  }

  /**
   * 캐시 초기화
   */
  clear(): void {
    this.cache.clear();
    this.stats.totalItems = 0;
    this.logger.log('AI Cache cleared');
  }

  /**
   * 캐시 통계 조회
   */
  getStats(): CacheStats & { hitRate: string } {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 
      ? ((this.stats.hits / total) * 100).toFixed(2) + '%'
      : '0%';
    
    return {
      ...this.stats,
      hitRate,
    };
  }

  /**
   * 쿼리 정규화
   * - 유사한 쿼리가 같은 캐시 키를 공유하도록
   */
  private normalizeQuery(query: string): string {
    return query
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')           // 다중 공백 → 단일 공백
      .replace(/[.!?]+$/g, '')        // 끝 문장부호 제거
      .replace(/\s*(찾아줘|추천해줘|알려줘|보여줘|있을까|있어)\s*/g, '') // 요청 표현 제거
      .trim();
  }

  /**
   * 컨텍스트 정규화
   */
  private normalizeContext(context: Record<string, unknown>): Record<string, unknown> {
    const normalized: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(context)) {
      // null, undefined, 빈 배열, 빈 문자열 제외
      if (
        value !== null &&
        value !== undefined &&
        value !== '' &&
        !(Array.isArray(value) && value.length === 0)
      ) {
        normalized[key] = value;
      }
    }
    
    return normalized;
  }

  /**
   * 가장 오래된 항목 제거 (LRU 방식)
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      // 히트 횟수가 적고 오래된 항목 우선 제거
      const score = entry.createdAt - (entry.hitCount * 60000); // 히트당 1분 보너스
      if (score < oldestTime) {
        oldestTime = score;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.logger.debug(`Evicted oldest cache entry: ${oldestKey}`);
    }
  }

  /**
   * 만료된 항목 정리
   */
  private cleanupExpired(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.stats.totalItems = this.cache.size;
      this.logger.debug(`Cleaned up ${cleanedCount} expired AI cache entries`);
    }
  }

  /**
   * 정리 타이머 시작
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpired();
    }, this.config.cleanupInterval);
  }

  /**
   * 정리 타이머 중지
   */
  private stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}

