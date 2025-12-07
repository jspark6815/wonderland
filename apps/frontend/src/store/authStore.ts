import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient } from '@/api/client';

/**
 * 사용자 정보 인터페이스
 */
export interface User {
  id: string;
  email: string;
  name?: string;
  role: 'user' | 'admin';
}

/**
 * 토큰 응답 인터페이스
 */
interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * 인증 상태 인터페이스
 */
interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // 액션
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshTokens: () => Promise<void>;
  clearError: () => void;
  fetchUser: () => Promise<void>;
}

/**
 * 인증 상태 관리 Store
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      /**
       * 로그인
       */
      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await apiClient.post<TokenResponse>('/auth/login', {
            email,
            password,
          });

          const { accessToken, refreshToken } = response;
          
          // 토큰 저장
          localStorage.setItem('token', accessToken);
          
          set({
            accessToken,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });

          // 사용자 정보 가져오기
          await get().fetchUser();
        } catch (error: unknown) {
          const errorMessage = error instanceof Error 
            ? error.message 
            : '로그인에 실패했습니다.';
          
          set({
            isLoading: false,
            error: errorMessage,
            isAuthenticated: false,
          });
          throw error;
        }
      },

      /**
       * 회원가입
       */
      register: async (email: string, password: string, name?: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await apiClient.post<TokenResponse>('/auth/register', {
            email,
            password,
            name,
          });

          const { accessToken, refreshToken } = response;
          
          // 토큰 저장
          localStorage.setItem('token', accessToken);
          
          set({
            accessToken,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });

          // 사용자 정보 가져오기
          await get().fetchUser();
        } catch (error: unknown) {
          const errorMessage = error instanceof Error 
            ? error.message 
            : '회원가입에 실패했습니다.';
          
          set({
            isLoading: false,
            error: errorMessage,
            isAuthenticated: false,
          });
          throw error;
        }
      },

      /**
       * 로그아웃
       */
      logout: async () => {
        try {
          const { accessToken } = get();
          if (accessToken) {
            await apiClient.post('/auth/logout');
          }
        } catch {
          // 로그아웃 API 실패해도 로컬 상태는 초기화
        } finally {
          localStorage.removeItem('token');
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            error: null,
          });
        }
      },

      /**
       * 토큰 갱신
       */
      refreshTokens: async () => {
        const { refreshToken } = get();
        
        if (!refreshToken) {
          throw new Error('Refresh token not found');
        }

        try {
          const response = await apiClient.post<TokenResponse>('/auth/refresh', {
            refreshToken,
          });

          const { accessToken, refreshToken: newRefreshToken } = response;
          
          localStorage.setItem('token', accessToken);
          
          set({
            accessToken,
            refreshToken: newRefreshToken,
          });
        } catch (error) {
          // 토큰 갱신 실패 시 로그아웃
          await get().logout();
          throw error;
        }
      },

      /**
       * 사용자 정보 가져오기
       */
      fetchUser: async () => {
        try {
          const user = await apiClient.get<User>('/auth/me');
          set({ user });
        } catch {
          // 사용자 정보 가져오기 실패 시 로그아웃
          await get().logout();
        }
      },

      /**
       * 에러 초기화
       */
      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

