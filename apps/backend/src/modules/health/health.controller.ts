import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../../common';
import { HealthService, HealthCheckResult } from './health.service';

@ApiTags('health')
@Controller('api/v1/health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /**
   * 기본 헬스 체크
   * 서버가 살아있는지 확인하는 간단한 엔드포인트
   */
  @Get()
  @Public()
  @ApiOperation({ summary: '서버 상태 확인' })
  @ApiResponse({
    status: 200,
    description: '서버 정상',
  })
  getHealth(): { status: string; timestamp: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 상세 헬스 체크
   * 데이터베이스 연결 등 상세 상태 확인
   */
  @Get('detailed')
  @Public()
  @ApiOperation({ summary: '상세 서버 상태 확인' })
  @ApiResponse({
    status: 200,
    description: '상세 서버 상태',
  })
  async getDetailedHealth(): Promise<HealthCheckResult> {
    return this.healthService.check();
  }

  /**
   * Readiness 체크
   * Kubernetes readiness probe용 엔드포인트
   */
  @Get('readiness')
  @Public()
  @ApiOperation({ summary: 'Readiness 체크 (K8s)' })
  @ApiResponse({
    status: 200,
    description: '준비 완료',
  })
  async getReadiness(): Promise<{ ready: boolean }> {
    const health = await this.healthService.check();
    return { ready: health.status === 'healthy' };
  }

  /**
   * Liveness 체크
   * Kubernetes liveness probe용 엔드포인트
   */
  @Get('liveness')
  @Public()
  @ApiOperation({ summary: 'Liveness 체크 (K8s)' })
  @ApiResponse({
    status: 200,
    description: '서버 정상 동작 중',
  })
  getLiveness(): { alive: boolean } {
    return { alive: true };
  }
}

