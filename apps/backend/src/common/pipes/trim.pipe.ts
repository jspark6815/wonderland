import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';

/**
 * 문자열 공백을 제거하는 파이프
 * 객체의 경우 모든 문자열 필드에 trim 적용
 * 
 * @example
 * ```typescript
 * @Post()
 * @UsePipes(TrimPipe)
 * create(@Body() dto: CreateDto) {
 *   // dto의 모든 문자열 필드가 trim됨
 * }
 * ```
 */
@Injectable()
export class TrimPipe implements PipeTransform {
  transform(value: unknown, _metadata: ArgumentMetadata): unknown {
    if (typeof value === 'string') {
      return value.trim();
    }

    if (typeof value === 'object' && value !== null) {
      return this.trimObject(value as Record<string, unknown>);
    }

    return value;
  }

  private trimObject(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        result[key] = value.trim();
      } else if (Array.isArray(value)) {
        result[key] = value.map((item) =>
          typeof item === 'string' ? item.trim() : item,
        );
      } else if (typeof value === 'object' && value !== null) {
        result[key] = this.trimObject(value as Record<string, unknown>);
      } else {
        result[key] = value;
      }
    }

    return result;
  }
}

