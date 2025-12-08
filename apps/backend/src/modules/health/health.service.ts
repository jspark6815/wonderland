import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

/**
 * 개별 컴포넌트 상태
 */
export interface ComponentStatus {
  status: 'up' | 'down';
  responseTime?: number;
  message?: string;
}

/**
 * 전체 헬스 체크 결과
 */
export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  components: {
    database: ComponentStatus;
    memory: ComponentStatus;
  };
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly startTime = Date.now();

  constructor(private readonly dataSource: DataSource) {}

  /**
   * 전체 헬스 체크 수행
   */
  async check(): Promise<HealthCheckResult> {
    const [database, memory] = await Promise.all([
      this.checkDatabase(),
      this.checkMemory(),
    ]);

    // 전체 상태 결정
    let status: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
    
    if (database.status === 'down') {
      status = 'unhealthy';
    } else if (memory.status === 'down') {
      status = 'degraded';
    }

    return {
      status,
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      components: {
        database,
        memory,
      },
    };
  }

  /**
   * 데이터베이스 연결 체크
   */
  private async checkDatabase(): Promise<ComponentStatus> {
    const startTime = Date.now();
    
    try {
      if (!this.dataSource.isInitialized) {
        return {
          status: 'down',
          message: 'Database not initialized',
        };
      }

      // 간단한 쿼리로 연결 확인
      await this.dataSource.query('SELECT 1');
      
      return {
        status: 'up',
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      this.logger.error(`Database health check failed: ${error instanceof Error ? error.message : 'Unknown'}`);
      return {
        status: 'down',
        responseTime: Date.now() - startTime,
        message: 'Database connection failed',
      };
    }
  }

  /**
   * 메모리 사용량 체크
   */
  private checkMemory(): ComponentStatus {
    const memoryUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
    const usagePercent = Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100);

    // 메모리 사용량이 90% 이상이면 경고
    const status = usagePercent > 90 ? 'down' : 'up';

    return {
      status,
      message: `${heapUsedMB}MB / ${heapTotalMB}MB (${usagePercent}%)`,
    };
  }
}

