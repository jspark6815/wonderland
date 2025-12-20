import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog, AuditAction } from '../../entities/audit-log.entity';

export interface AuditContext {
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

/**
 * 감사 로그 서비스
 * 모든 중요한 데이터 변경 및 접근 이력을 추적
 * 
 * 사용 예:
 * ```
 * await auditService.logCreate('Place', place.id, place, ctx);
 * await auditService.logUpdate('Place', place.id, oldData, newData, ctx);
 * await auditService.logDelete('Place', place.id, oldData, ctx);
 * ```
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepository: Repository<AuditLog>,
  ) {}

  /**
   * 생성 이벤트 로깅
   */
  async logCreate(
    entityType: string,
    entityId: string,
    newData: Record<string, unknown>,
    context?: AuditContext,
  ): Promise<AuditLog> {
    return this.createLog(AuditAction.CREATE, entityType, entityId, null, newData, context);
  }

  /**
   * 수정 이벤트 로깅
   */
  async logUpdate(
    entityType: string,
    entityId: string,
    oldData: Record<string, unknown>,
    newData: Record<string, unknown>,
    context?: AuditContext,
  ): Promise<AuditLog> {
    const changedFields = this.getChangedFields(oldData, newData);
    return this.createLog(AuditAction.UPDATE, entityType, entityId, oldData, newData, context, changedFields);
  }

  /**
   * 삭제 이벤트 로깅
   */
  async logDelete(
    entityType: string,
    entityId: string,
    oldData: Record<string, unknown>,
    context?: AuditContext,
  ): Promise<AuditLog> {
    return this.createLog(AuditAction.DELETE, entityType, entityId, oldData, null, context);
  }

  /**
   * 소프트 삭제 이벤트 로깅
   */
  async logSoftDelete(
    entityType: string,
    entityId: string,
    context?: AuditContext,
  ): Promise<AuditLog> {
    return this.createLog(AuditAction.SOFT_DELETE, entityType, entityId, null, null, context);
  }

  /**
   * 복원 이벤트 로깅
   */
  async logRestore(
    entityType: string,
    entityId: string,
    context?: AuditContext,
  ): Promise<AuditLog> {
    return this.createLog(AuditAction.RESTORE, entityType, entityId, null, null, context);
  }

  /**
   * 조회 이벤트 로깅 (선택적)
   */
  async logView(
    entityType: string,
    entityId: string,
    context?: AuditContext,
  ): Promise<AuditLog> {
    return this.createLog(AuditAction.VIEW, entityType, entityId, null, null, context);
  }

  /**
   * 검색 이벤트 로깅
   */
  async logSearch(
    entityType: string,
    searchParams: Record<string, unknown>,
    context?: AuditContext,
  ): Promise<AuditLog> {
    return this.createLog(
      AuditAction.SEARCH, 
      entityType, 
      'search', 
      null, 
      searchParams, 
      context
    );
  }

  /**
   * 즐겨찾기 이벤트 로깅
   */
  async logFavorite(
    entityType: string,
    entityId: string,
    isFavorite: boolean,
    context?: AuditContext,
  ): Promise<AuditLog> {
    return this.createLog(
      isFavorite ? AuditAction.FAVORITE : AuditAction.UNFAVORITE,
      entityType,
      entityId,
      null,
      { isFavorite },
      context
    );
  }

  /**
   * 피드백 이벤트 로깅
   */
  async logFeedback(
    entityType: string,
    entityId: string,
    feedbackData: Record<string, unknown>,
    context?: AuditContext,
  ): Promise<AuditLog> {
    return this.createLog(AuditAction.FEEDBACK, entityType, entityId, null, feedbackData, context);
  }

  /**
   * 로그 조회 (엔티티별)
   */
  async getLogsForEntity(
    entityType: string,
    entityId: string,
    limit = 50,
  ): Promise<AuditLog[]> {
    return this.auditRepository.find({
      where: { entityType, entityId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * 로그 조회 (사용자별)
   */
  async getLogsForUser(
    userId: string,
    limit = 100,
  ): Promise<AuditLog[]> {
    return this.auditRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * 로그 생성 (내부)
   */
  private async createLog(
    action: AuditAction,
    entityType: string,
    entityId: string,
    oldData: Record<string, unknown> | null,
    newData: Record<string, unknown> | null,
    context?: AuditContext,
    changedFields?: string[],
  ): Promise<AuditLog> {
    try {
      const log = this.auditRepository.create({
        action,
        entityType,
        entityId,
        userId: context?.userId,
        oldData: oldData ?? undefined,
        newData: newData ?? undefined,
        changedFields,
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
        metadata: context?.metadata,
      });

      const saved = await this.auditRepository.save(log);
      this.logger.debug(`Audit log created: ${action} ${entityType}:${entityId}`);
      return saved;
    } catch (error) {
      // 감사 로그 실패는 비즈니스 로직에 영향을 주지 않도록 함
      this.logger.error(`Failed to create audit log: ${error}`);
      throw error;
    }
  }

  /**
   * 변경된 필드 추출
   */
  private getChangedFields(
    oldData: Record<string, unknown>,
    newData: Record<string, unknown>,
  ): string[] {
    const changedFields: string[] = [];
    const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);

    for (const key of allKeys) {
      // 메타데이터 필드 제외
      if (['updatedAt', 'createdAt', 'version'].includes(key)) continue;

      const oldValue = JSON.stringify(oldData[key]);
      const newValue = JSON.stringify(newData[key]);

      if (oldValue !== newValue) {
        changedFields.push(key);
      }
    }

    return changedFields;
  }
}

