import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from '../../entities/audit-log.entity';
import { AuditService } from './audit.service';

/**
 * 감사 로그 모듈
 * @Global() - 전역 모듈로 등록하여 모든 모듈에서 AuditService 사용 가능
 */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}

