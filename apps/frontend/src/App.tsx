import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MapPage } from './pages/MapPage';
import { useAuthStore } from './store/authStore';

function App(): JSX.Element {
  const [isInitialized, setIsInitialized] = useState(false);
  const { isAuthenticated, accessToken, fetchUser, logout } = useAuthStore();

  // 앱 시작 시 인증 상태 복원
  useEffect(() => {
    const initAuth = async () => {
      // 저장된 토큰이 있고 인증 상태라면 사용자 정보 복원
      if (isAuthenticated && accessToken) {
        try {
          await fetchUser();
        } catch {
          // 사용자 정보 가져오기 실패 시 로그아웃
          await logout();
        }
      }
      setIsInitialized(true);
    };

    initAuth();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 로그아웃 이벤트 리스너 (토큰 갱신 실패 시 API 클라이언트에서 발생)
  useEffect(() => {
    const handleLogout = () => {
      logout();
    };

    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, [logout]);

  // 초기화 중일 때 로딩 표시
  if (!isInitialized) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent" />
          <p className="text-gray-500 text-sm">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MapPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

