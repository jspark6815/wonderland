import React, { useState, useCallback, useEffect } from 'react';
import { NaverMap } from '@/components/map/NaverMap';
import { SearchBar } from '@/components/search/SearchBar';
import { PlaceList } from '@/components/places/PlaceList';
import { PlaceDetail } from '@/components/places/PlaceDetail';
import { ChatInterface } from '@/components/ai/ChatInterface';
import { useIntegratedSearch } from '@/hooks/useIntegratedSearch';
import { Place } from '@wonderland/shared';

export const MapPage: React.FC = () => {
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'search' | 'ai'>('search');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  
  const { 
    search, 
    searchNearby, 
    places, 
    aiInterpretation,
    isFromAI,
    isLoading, 
    error 
  } = useIntegratedSearch();

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    try {
      await search(query);
      
      // AI 해석 결과가 있으면 표시
      if (isFromAI && aiInterpretation) {
        console.log('AI 해석 결과:', aiInterpretation);
      }
    } catch (err) {
      console.error('검색 실패:', err);
    }
  }, [search, isFromAI, aiInterpretation]);

  const handlePlaceSelect = useCallback((place: Place) => {
    setSelectedPlace(place);
    setShowDetail(true);
  }, []);

  const handleAIResponse = useCallback(async (query: string) => {
    // AI 대화를 통한 검색
    setSearchQuery(query);
    await handleSearch(query);
    setActiveTab('search'); // 검색 결과 탭으로 전환
  }, [handleSearch]);

  return (
    <div className="h-screen flex bg-gray-50 relative">
      {/* 모바일 메뉴 버튼 */}
      <button
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        className="md:hidden fixed top-4 left-4 z-30 bg-white p-2 rounded-lg shadow-lg"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* 좌측 사이드바 */}
      <div 
        className={`${
          sidebarCollapsed ? 'w-0 md:w-0' : 'w-full md:w-[400px]'
        } fixed md:relative h-full transition-all duration-300 bg-white shadow-xl z-20 flex flex-col overflow-hidden`}
      >
        {!sidebarCollapsed && (
          <>
            {/* 헤더 */}
            <div className="border-b bg-white">
              {/* 로고 및 타이틀 */}
              <div className="p-4 pb-0">
                <h1 className="text-2xl font-bold text-blue-600">Wonderland</h1>
                <p className="text-sm text-gray-600 mt-1">AI가 안내하는 놀라운 장소 발견</p>
              </div>

              {/* 탭 전환 */}
              <div className="flex p-4 pb-0 gap-2">
                <button
                  onClick={() => setActiveTab('search')}
                  className={`flex-1 py-2.5 px-4 rounded-t-lg font-medium transition-all ${
                    activeTab === 'search'
                      ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    검색
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('ai')}
                  className={`flex-1 py-2.5 px-4 rounded-t-lg font-medium transition-all ${
                    activeTab === 'ai'
                      ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    AI 추천
                  </span>
                </button>
              </div>

              {/* 검색바 */}
              <div className="p-4">
                <SearchBar
                  value={searchQuery}
                  onChange={setSearchQuery}
                  onSearch={handleSearch}
                  placeholder={activeTab === 'search' ? "장소, 주소를 검색하세요" : "무엇을 찾고 계신가요?"}
                  className="w-full"
                />
              </div>

              {/* 빠른 필터 (검색 탭에서만) */}
              {activeTab === 'search' && (
                <div className="px-4 pb-3 overflow-x-auto">
                  <div className="flex gap-2 min-w-max">
                    <button className="px-4 py-1.5 rounded-full bg-blue-100 text-blue-700 text-sm font-medium whitespace-nowrap">
                      전체
                    </button>
                    <button className="px-4 py-1.5 rounded-full bg-white border border-gray-300 text-gray-700 text-sm hover:bg-gray-50 whitespace-nowrap">
                      음식점
                    </button>
                    <button className="px-4 py-1.5 rounded-full bg-white border border-gray-300 text-gray-700 text-sm hover:bg-gray-50 whitespace-nowrap">
                      카페
                    </button>
                    <button className="px-4 py-1.5 rounded-full bg-white border border-gray-300 text-gray-700 text-sm hover:bg-gray-50 whitespace-nowrap">
                      편의점
                    </button>
                    <button className="px-4 py-1.5 rounded-full bg-white border border-gray-300 text-gray-700 text-sm hover:bg-gray-50 whitespace-nowrap">
                      병원
                    </button>
                    <button className="px-4 py-1.5 rounded-full bg-white border border-gray-300 text-gray-700 text-sm hover:bg-gray-50 whitespace-nowrap">
                      은행
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 컨텐츠 영역 */}
            <div className="flex-1 overflow-y-auto">
              {activeTab === 'search' ? (
                <PlaceList
                  places={places}
                  isLoading={isLoading}
                  onPlaceClick={handlePlaceSelect}
                  className="h-full"
                />
              ) : (
                <div className="h-full">
                  <ChatInterface 
                    onSearch={handleAIResponse}
                    className="h-full"
                  />
                </div>
              )}
            </div>

            {/* 하단 정보 */}
            <div className="p-3 border-t bg-gray-50 text-xs text-gray-500">
              <div className="flex items-center justify-between">
                <span>© 2024 Wonderland</span>
                <span>Powered by Naver Maps</span>
              </div>
            </div>
          </>
        )}

        {/* 사이드바 토글 버튼 (데스크톱) */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="hidden md:block absolute -right-12 top-1/2 -translate-y-1/2 bg-white p-2.5 rounded-r-lg shadow-lg hover:shadow-xl transition-all z-30"
        >
          <svg
            className="w-5 h-5 text-gray-700"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={sidebarCollapsed ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"}
            />
          </svg>
        </button>
      </div>

      {/* 우측 지도 영역 */}
      <div className="flex-1 relative">
        <NaverMap
          places={places}
          onPlaceClick={handlePlaceSelect}
          className="w-full h-full"
        />

        {/* 지도 컨트롤 */}
        <div className="absolute top-4 right-4 flex flex-col gap-2 md:top-4 top-16">
          {/* 지도 타입 전환 */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <button 
              className="p-3 hover:bg-gray-100 transition-colors border-b"
              title="일반지도"
            >
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </button>
            <button 
              className="p-3 hover:bg-gray-100 transition-colors"
              title="위성지도"
            >
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>

          {/* 줌 컨트롤 */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <button 
              onClick={() => {
                const event = new CustomEvent('zoomIn');
                window.dispatchEvent(event);
              }}
              className="p-3 hover:bg-gray-100 transition-colors border-b"
              title="확대"
            >
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
            <button 
              onClick={() => {
                const event = new CustomEvent('zoomOut');
                window.dispatchEvent(event);
              }}
              className="p-3 hover:bg-gray-100 transition-colors"
              title="축소"
            >
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
          </div>
        </div>

        {/* 현재 위치 버튼 */}
        <button
          onClick={() => {
            // NaverMap 컴포넌트에 현재 위치 기능 트리거
            const event = new CustomEvent('moveToCurrentLocation');
            window.dispatchEvent(event);
          }}
          className="absolute bottom-6 right-6 bg-white p-3.5 rounded-full shadow-lg hover:shadow-xl transition-all group"
          title="현재 위치"
        >
          <svg className="w-6 h-6 text-blue-500 group-hover:text-blue-600" fill="currentColor" viewBox="0 0 24 24">
            <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
          </svg>
        </button>

        {/* 장소 상세 정보 모달 */}
        {showDetail && selectedPlace && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
              <PlaceDetail
                place={selectedPlace}
                onClose={() => {
                  setShowDetail(false);
                  setSelectedPlace(null);
                }}
                className="h-full"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};