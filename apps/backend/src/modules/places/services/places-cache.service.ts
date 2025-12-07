import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { createHash } from 'crypto';

/**
 * 캐시 항목 인터페이스
 */
interface CacheEntry<T> {
  data: T;
  expiry: number;
  size: number; // 대략적인 메모리 크기 추정
}

/**
 * 캐시 설정
 */
interface CacheConfig {
  /** 최대 항목 수 (기본: 1000) */
  maxItems: number;
  /** 최대 메모리 (bytes, 기본: 50MB) */
  maxMemory: number;
  /** 정리 주기 (ms, 기본: 60초) */
  cleanupInterval: number;
  /** 민감 키워드 (캐싱 제외) */
  sensitiveKeywords: string[];
}

/**
 * 장소 캐시 서비스
 * - 메모리 누수 방지 (자동 정리)
 * - 크기 제한 (LRU 방식)
 * - 민감 정보 캐싱 방지
 */
@Injectable()
export class PlacesCacheService implements OnModuleDestroy {
  private readonly logger = new Logger(PlacesCacheService.name);
  private cache = new Map<string, CacheEntry<unknown>>();
  private accessOrder: string[] = []; // LRU 추적
  private currentMemory = 0;
  private cleanupTimer: NodeJS.Timeout | null = null;

  private readonly config: CacheConfig = {
    maxItems: parseInt(process.env.CACHE_MAX_ITEMS || '1000', 10),
    maxMemory: parseInt(process.env.CACHE_MAX_MEMORY || '52428800', 10), // 50MB
    cleanupInterval: parseInt(process.env.CACHE_CLEANUP_INTERVAL || '60000', 10),
    sensitiveKeywords: ['password', 'token', 'secret', 'apiKey', 'creditCard'],
  };

  constructor() {
    this.startCleanupTimer();
  }

  onModuleDestroy(): void {
    this.stopCleanupTimer();
    this.cache.clear();
  }

  /**
   * 캐시 키 생성
   */
  generateKey(prefix: string, params: object): string {
    // DTO 객체를 plain object로 변환
    const plainParams = JSON.parse(JSON.stringify(params)) as Record<string, unknown>;
    // 민감 정보가 포함된 파라미터는 제외
    const sanitizedParams = this.sanitizeParams(plainParams);
    const hash = createHash('sha256')
      .update(JSON.stringify(sanitizedParams))
      .digest('hex')
      .substring(0, 16); // 16자로 단축
    return `${prefix}:${hash}`;
  }

  /**
   * 캐시에서 가져오기
   */
  async get<T>(key: string): Promise<T | null> {
    const cached = this.cache.get(key);
    
    if (!cached) {
      return null;
    }

    // 만료 체크
    if (Date.now() > cached.expiry) {
      this.deleteEntry(key);
      return null;
    }

    // LRU 업데이트
    this.updateAccessOrder(key);
    
    return cached.data as T;
  }

  /**
   * 캐시에 저장
   */
  async set<T>(key: string, data: T, ttl: number = 300): Promise<void> {
    // 민감 정보 체크
    if (this.containsSensitiveData(data)) {
      this.logger.warn(`Attempted to cache sensitive data for key: ${key.substring(0, 20)}...`);
      return;
    }

    const size = this.estimateSize(data);
    const expiry = Date.now() + (ttl * 1000);

    // 용량 확보
    await this.ensureCapacity(size);

    // 기존 항목 업데이트 시 메모리 조정
    const existing = this.cache.get(key);
    if (existing) {
      this.currentMemory -= existing.size;
    }

    this.cache.set(key, { data, expiry, size });
    this.currentMemory += size;
    this.updateAccessOrder(key);
  }

  /**
   * 캐시 삭제
   */
  async delete(key: string): Promise<void> {
    this.deleteEntry(key);
  }

  /**
   * 캐시 초기화
   */
  async clear(): Promise<void> {
    this.cache.clear();
    this.accessOrder = [];
    this.currentMemory = 0;
    this.logger.debug('Cache cleared');
  }

  /**
   * 캐시 통계
   */
  getStats(): { items: number; memory: number; maxMemory: number } {
    return {
      items: this.cache.size,
      memory: this.currentMemory,
      maxMemory: this.config.maxMemory,
    };
  }

  /**
   * 민감 파라미터 제거
   */
  private sanitizeParams(params: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(params)) {
      const keyLower = key.toLowerCase();
      const isSensitive = this.config.sensitiveKeywords.some(
        keyword => keyLower.includes(keyword.toLowerCase())
      );
      
      if (!isSensitive) {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }

  /**
   * 민감 데이터 포함 여부 체크
   */
  private containsSensitiveData(data: unknown): boolean {
    if (data === null || data === undefined) return false;
    
    const jsonStr = JSON.stringify(data).toLowerCase();
    return this.config.sensitiveKeywords.some(
      keyword => jsonStr.includes(keyword.toLowerCase())
    );
  }

  /**
   * 데이터 크기 추정 (bytes)
   */
  private estimateSize(data: unknown): number {
    try {
      return new TextEncoder().encode(JSON.stringify(data)).length;
    } catch {
      return 1024; // 기본값 1KB
    }
  }

  /**
   * 용량 확보 (LRU 방식)
   */
  private async ensureCapacity(requiredSize: number): Promise<void> {
    // 항목 수 제한
    while (this.cache.size >= this.config.maxItems && this.accessOrder.length > 0) {
      const oldestKey = this.accessOrder.shift();
      if (oldestKey) {
        this.deleteEntry(oldestKey);
      }
    }

    // 메모리 제한
    while (
      this.currentMemory + requiredSize > this.config.maxMemory &&
      this.accessOrder.length > 0
    ) {
      const oldestKey = this.accessOrder.shift();
      if (oldestKey) {
        this.deleteEntry(oldestKey);
      }
    }
  }

  /**
   * LRU 순서 업데이트
   */
  private updateAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
  }

  /**
   * 항목 삭제
   */
  private deleteEntry(key: string): void {
    const entry = this.cache.get(key);
    if (entry) {
      this.currentMemory -= entry.size;
      this.cache.delete(key);
    }
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
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

  /**
   * 만료된 항목 정리
   */
  private cleanupExpired(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.deleteEntry(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.debug(`Cleaned up ${cleanedCount} expired cache entries`);
    }
  }
}
