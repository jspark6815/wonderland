import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

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

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    if (error.response) {
      // 서버 에러
      console.error('Server Error:', error.response.data);
      
      if (error.response.status === 401) {
        // 인증 오류 처리
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    } else if (error.request) {
      // 네트워크 에러
      console.error('Network Error:', error.request);
    } else {
      // 기타 에러
      console.error('Error:', error.message);
    }
    
    return Promise.reject(error);
  }
);
