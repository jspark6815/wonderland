import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';

@Injectable()
export class PlacesCacheService {
  private cache = new Map<string, { data: any; expiry: number }>();

  /**
   * 캐시 키 생성
   */
  generateKey(prefix: string, params: any): string {
    const hash = createHash('md5')
      .update(JSON.stringify(params))
      .digest('hex');
    return `${prefix}:${hash}`;
  }

  /**
   * 캐시에서 가져오기
   */
  async get(key: string): Promise<any> {
    const cached = this.cache.get(key);
    
    if (!cached) {
      return null;
    }

    if (Date.now() > cached.expiry) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * 캐시에 저장
   */
  async set(key: string, data: any, ttl: number = 300): Promise<void> {
    const expiry = Date.now() + (ttl * 1000);
    this.cache.set(key, { data, expiry });
  }

  /**
   * 캐시 삭제
   */
  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  /**
   * 캐시 초기화
   */
  async clear(): Promise<void> {
    this.cache.clear();
  }
}
