/**
 * 네이버 지도 스크립트를 동적으로 로드하는 유틸리티
 * 새로운 통합 API 키 형식 지원 (ncpKeyId)
 */

interface LoadNaverMapOptions {
  keyId?: string;
  clientId?: string; // 하위 호환성을 위해 유지
  submodules?: string[];
}

let isLoading = false;
let isLoaded = false;

export const loadNaverMapScript = (
  options: LoadNaverMapOptions = {}
): Promise<void> => {
  return new Promise((resolve, reject) => {
    // 이미 로드되었으면 바로 resolve
    if (isLoaded && window.naver?.maps) {
      resolve();
      return;
    }

    // 로딩 중이면 로드 완료까지 대기
    if (isLoading) {
      const checkInterval = setInterval(() => {
        if (isLoaded && window.naver?.maps) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
      return;
    }

    isLoading = true;

    // 환경변수에서 키 가져오기 (새 형식 우선)
    const keyId = options.keyId || import.meta.env.VITE_NAVER_MAP_KEY_ID;
    const clientId = options.clientId || import.meta.env.VITE_NAVER_MAP_CLIENT_ID;
    const submodules = options.submodules?.join(',') || 'geocoder';

    if (!keyId && !clientId) {
      reject(new Error('네이버 지도 API 키가 설정되지 않았습니다.'));
      return;
    }

    // 새 형식 우선 사용, 없으면 기존 형식 사용
    const keyParam = keyId ? `ncpKeyId=${keyId}` : `ncpClientId=${clientId}`;
    const scriptUrl = `https://oapi.map.naver.com/openapi/v3/maps.js?${keyParam}&submodules=${submodules}`;

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = scriptUrl;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      isLoading = false;
      isLoaded = true;
      console.log('네이버 지도 API 로드 완료');
      resolve();
    };

    script.onerror = () => {
      isLoading = false;
      reject(new Error('네이버 지도 API 로드 실패'));
    };

    document.head.appendChild(script);
  });
};

export const isNaverMapLoaded = (): boolean => {
  return isLoaded && !!window.naver?.maps;
};
