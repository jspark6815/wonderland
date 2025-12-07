/**
 * 페이지네이션 메타 정보
 */
export interface PaginationMeta {
  /** 현재 페이지 번호 (1부터 시작) */
  page: number;
  /** 페이지당 항목 수 */
  limit: number;
  /** 전체 항목 수 */
  total: number;
  /** 전체 페이지 수 */
  totalPages: number;
  /** 다음 페이지 존재 여부 */
  hasNextPage: boolean;
  /** 이전 페이지 존재 여부 */
  hasPrevPage: boolean;
}

/**
 * 페이지네이션이 적용된 응답
 */
export interface PaginatedResponse<T> {
  /** 데이터 배열 */
  data: T[];
  /** 페이지네이션 메타 정보 */
  meta: PaginationMeta;
}

/**
 * 페이지네이션 메타 정보 생성 헬퍼
 */
export function createPaginationMeta(
  page: number,
  limit: number,
  total: number,
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

