/**
 * 거리 포맷팅 (미터 → 킬로미터/미터)
 */
export function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)}km`;
  }
  return `${Math.round(meters)}m`;
}

/**
 * 평점 포맷팅
 */
export function formatRating(rating: number): string {
  return rating.toFixed(1);
}

/**
 * 날짜 포맷팅
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('ko-KR');
}

