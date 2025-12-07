import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

/**
 * API 에러 타입 정의
 */
export interface ApiError {
  statusCode: number;
  message: string | string[];
  error?: string;
  timestamp?: string;
}

/**
 * 토큰 갱신 응답 타입
 */
interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// 토큰 갱신 상태 관리
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: Error) => void;
}> = [];

/**
 * 대기 중인 요청들 처리
 */
const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else if (token) {
      resolve(token);
    }
  });
  failedQueue = [];
};

/**
 * API 클라이언트
 */
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // 토큰이 있다면 추가
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - 토큰 자동 갱신 포함
apiClient.interceptors.response.use(
  (response) => {
    return response.data;
  },
  async (error: AxiosError<ApiError>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    
    // 401 에러 && 재시도하지 않은 요청 && refresh 요청이 아닌 경우
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/refresh') &&
      !originalRequest.url?.includes('/auth/login')
    ) {
      // 이미 토큰 갱신 중이면 대기열에 추가
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      // auth-storage에서 refreshToken 가져오기
      const authStorage = localStorage.getItem('auth-storage');
      const refreshToken = authStorage ? JSON.parse(authStorage)?.state?.refreshToken : null;

      if (!refreshToken) {
        // refresh token 없으면 로그아웃
        isRefreshing = false;
        localStorage.removeItem('token');
        localStorage.removeItem('auth-storage');
        window.dispatchEvent(new CustomEvent('auth:logout'));
        return Promise.reject(error);
      }

      try {
        // 토큰 갱신 요청 (axios 직접 사용 - 인터셉터 무한루프 방지)
        const response = await axios.post<TokenResponse>(
          `${API_BASE_URL}/auth/refresh`,
          { refreshToken }
        );

        const { accessToken, refreshToken: newRefreshToken } = response.data;

        // 새 토큰 저장
        localStorage.setItem('token', accessToken);
        
        // auth-storage 업데이트
        if (authStorage) {
          const storage = JSON.parse(authStorage);
          storage.state.accessToken = accessToken;
          storage.state.refreshToken = newRefreshToken;
          localStorage.setItem('auth-storage', JSON.stringify(storage));
        }

        // 대기 중인 요청들 처리
        processQueue(null, accessToken);
        
        // 원래 요청 재시도
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // 토큰 갱신 실패
        processQueue(refreshError as Error, null);
        localStorage.removeItem('token');
        localStorage.removeItem('auth-storage');
        window.dispatchEvent(new CustomEvent('auth:logout'));
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // 다른 에러는 개발 환경에서만 로깅
    if (import.meta.env.DEV && error.response) {
      // eslint-disable-next-line no-console
      console.error('API Error:', error.response.data);
    }

    return Promise.reject(error);
  }
);
