import React, { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { AuthModal } from './AuthModal';
import { ProfilePanel, FavoritesPanel, SettingsPanel } from './UserPanels';

export const UserMenu: React.FC = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [panel, setPanel] = useState<'profile' | 'favorites' | 'settings' | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { user, isAuthenticated, logout } = useAuthStore();

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    setIsDropdownOpen(false);
  };

  // 로그인되지 않은 상태
  if (!isAuthenticated) {
    return (
      <>
        <button
          onClick={() => setIsAuthModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-105 active:scale-95 transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span>로그인</span>
        </button>

        <AuthModal 
          isOpen={isAuthModalOpen} 
          onClose={() => setIsAuthModalOpen(false)} 
        />
      </>
    );
  }

  // 로그인된 상태
  return (
    <div className="relative" ref={dropdownRef}>
      {/* 사용자 버튼 */}
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-800/80 backdrop-blur-sm border border-slate-700/50 hover:border-blue-500/50 hover:bg-slate-700/80 transition-all"
      >
        {/* 아바타 */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm shadow-lg">
          {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
        </div>
        
        {/* 사용자 정보 */}
        <div className="text-left hidden sm:block">
          <div className="text-sm font-medium text-white truncate max-w-[120px]">
            {user?.name || user?.email?.split('@')[0]}
          </div>
          <div className="text-xs text-slate-400 truncate max-w-[120px]">
            {user?.email}
          </div>
        </div>

        {/* 드롭다운 화살표 */}
        <svg 
          className={`w-4 h-4 text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* 드롭다운 메뉴 */}
      {isDropdownOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl bg-slate-800/95 backdrop-blur-sm border border-slate-700/50 shadow-2xl shadow-black/50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-50">
          {/* 사용자 정보 헤더 */}
          <div className="px-4 py-3 border-b border-slate-700/50">
            <div className="text-sm font-medium text-white">
              {user?.name || '사용자'}
            </div>
            <div className="text-xs text-slate-400 truncate">
              {user?.email}
            </div>
          </div>

          {/* 메뉴 항목 */}
          <div className="py-2">
            <button
              onClick={() => {
                setIsDropdownOpen(false);
                setPanel('profile');
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-slate-300 hover:bg-slate-700/50 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              내 프로필
            </button>

            <button
              onClick={() => {
                setIsDropdownOpen(false);
                setPanel('favorites');
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-slate-300 hover:bg-slate-700/50 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              즐겨찾기
            </button>

            <button
              onClick={() => {
                setIsDropdownOpen(false);
                setPanel('settings');
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-slate-300 hover:bg-slate-700/50 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              설정
            </button>
          </div>

          {/* 로그아웃 */}
          <div className="border-t border-slate-700/50 py-2">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              로그아웃
            </button>
          </div>
        </div>
      )}

      {/* 패널 모달 */}
      <ProfilePanel isOpen={panel === 'profile'} onClose={() => setPanel(null)} />
      <FavoritesPanel isOpen={panel === 'favorites'} onClose={() => setPanel(null)} />
      <SettingsPanel isOpen={panel === 'settings'} onClose={() => setPanel(null)} />
    </div>
  );
};

