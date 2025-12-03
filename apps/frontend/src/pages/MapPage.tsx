import React, { useState, useCallback } from 'react';
import { NaverMap } from '@/components/map/NaverMap';
import { PlaceList } from '@/components/places/PlaceList';
import { PlaceDetail } from '@/components/places/PlaceDetail';
import { ChatInterface } from '@/components/ai/ChatInterface';
import { useIntegratedSearch } from '@/hooks/useIntegratedSearch';
import { Place } from '@wonderland/shared';
import { searchPlacesByBoundsAPI, getPlaceDetailByLocationAPI, getPlaceDetailAPI } from '@/api/places.api';

export const MapPage: React.FC = () => {
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSidebar, setShowSidebar] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [isAutoSearching, setIsAutoSearching] = useState(false);
  const [autoSearchPlaces, setAutoSearchPlaces] = useState<Place[]>([]);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  const { 
    search, 
    places, 
    isLoading, 
  } = useIntegratedSearch();

  // 검색 실행
  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) return;
    
    setSearchQuery(query);
    setShowSidebar(true); // 검색 시 사이드바 자동 열기
    
    try {
      await search(query);
    } catch (err) {
      console.error('검색 실패:', err);
    }
  }, [search]);

  // 장소 선택
  const handlePlaceSelect = useCallback(async (place: Place) => {
    setIsLoadingDetail(true);
    setShowDetail(true);
    
    try {
      let detailPlace: Place;
      
      if (place.id) {
        try {
          detailPlace = await getPlaceDetailAPI(place.id);
        } catch (error) {
          if (place.latitude && place.longitude) {
            detailPlace = await getPlaceDetailByLocationAPI(
              place.name,
              typeof place.latitude === 'string' ? parseFloat(place.latitude) : place.latitude,
              typeof place.longitude === 'string' ? parseFloat(place.longitude) : place.longitude
            );
          } else {
            throw error;
          }
        }
      } else if (place.latitude && place.longitude) {
        detailPlace = await getPlaceDetailByLocationAPI(
          place.name,
          typeof place.latitude === 'string' ? parseFloat(place.latitude) : place.latitude,
          typeof place.longitude === 'string' ? parseFloat(place.longitude) : place.longitude
        );
      } else {
        detailPlace = place;
      }
      
      setSelectedPlace(detailPlace);
    } catch (error) {
      console.error('장소 상세 정보 조회 실패:', error);
      setSelectedPlace(place);
    } finally {
      setIsLoadingDetail(false);
    }
  }, []);

  // 지도 영역 변경 시 자동 검색
  const handleBoundsChange = useCallback(async (bounds: {
    south: number;
    north: number;
    west: number;
    east: number;
  }) => {
    if (searchQuery.trim()) return;

    setIsAutoSearching(true);
    try {
      const results = await searchPlacesByBoundsAPI(
        bounds.south,
        bounds.north,
        bounds.west,
        bounds.east,
        selectedCategory || undefined,
        50
      );
      setAutoSearchPlaces(results);
    } catch (error) {
      console.error('자동 검색 실패:', error);
    } finally {
      setIsAutoSearching(false);
    }
  }, [searchQuery, selectedCategory]);

  // 검색 초기화
  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setShowSidebar(false);
  }, []);

  // 표시할 장소 목록
  const displayPlaces = places.length > 0 ? places : autoSearchPlaces;

  // 카테고리 목록
  const categories = [
    { id: null, label: '전체', icon: '🏠' },
    { id: 'RESTAURANT', label: '음식점', icon: '🍽️' },
    { id: 'CAFE', label: '카페', icon: '☕' },
    { id: 'CONVENIENCE', label: '편의점', icon: '🏪' },
    { id: 'HEALTHCARE', label: '병원', icon: '🏥' },
    { id: 'SHOPPING', label: '쇼핑', icon: '🛍️' },
  ];

  return (
    <div className="h-screen w-screen relative overflow-hidden">
      {/* 지도 (전체 화면) */}
      <NaverMap
        places={displayPlaces}
        onPlaceClick={handlePlaceSelect}
        onBoundsChange={handleBoundsChange}
        enableAutoSearch={!searchQuery.trim()}
        className="w-full h-full"
      />

      {/* 상단 검색바 */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 w-full max-w-xl px-4 z-30">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* 메인 검색바 */}
          <div className="flex items-center">
            <div className="flex-1 flex items-center px-4">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch(searchQuery);
                  }
                }}
                placeholder="장소, 주소 검색"
                className="flex-1 px-3 py-3.5 text-gray-900 placeholder-gray-400 focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="p-1 hover:bg-gray-100 rounded-full"
                >
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            
            {/* AI 추천 버튼 */}
            <button
              onClick={() => setShowAIChat(true)}
              className="px-4 py-3.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium hover:from-blue-600 hover:to-blue-700 transition-all flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <span className="hidden sm:inline">AI 추천</span>
            </button>
          </div>

          {/* 카테고리 필터 */}
          <div className="border-t px-2 py-2 flex gap-1 overflow-x-auto scrollbar-thin">
            {categories.map((cat) => (
              <button
                key={cat.id || 'all'}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="mr-1">{cat.icon}</span>
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 검색 결과 사이드바 (검색 시 표시) */}
      {showSidebar && places.length > 0 && (
        <div className="absolute top-24 left-4 w-80 max-h-[calc(100vh-120px)] bg-white rounded-xl shadow-xl z-20 flex flex-col overflow-hidden">
          {/* 헤더 */}
          <div className="flex items-center justify-between p-3 border-b bg-gray-50">
            <div>
              <h3 className="font-semibold text-gray-900">검색 결과</h3>
              <p className="text-sm text-gray-500">{places.length}개의 장소</p>
            </div>
            <button
              onClick={clearSearch}
              className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* 결과 목록 */}
          <div className="flex-1 overflow-y-auto">
            <PlaceList
              places={places}
              isLoading={isLoading}
              onPlaceClick={handlePlaceSelect}
            />
          </div>
        </div>
      )}

      {/* 지도 컨트롤 (우측 상단) */}
      <div className="absolute top-24 right-4 flex flex-col gap-2 z-20">
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

      {/* 현재 위치 버튼 (우측 하단) */}
      <button
        onClick={() => {
          const event = new CustomEvent('moveToCurrentLocation');
          window.dispatchEvent(event);
        }}
        className="absolute bottom-6 right-6 bg-white p-3.5 rounded-full shadow-lg hover:shadow-xl transition-all group z-20"
        title="현재 위치"
      >
        <svg className="w-6 h-6 text-blue-500 group-hover:text-blue-600" fill="currentColor" viewBox="0 0 24 24">
          <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
        </svg>
      </button>

      {/* 로딩 인디케이터 */}
      {(isLoading || isAutoSearching) && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white px-4 py-2 rounded-full shadow-lg z-20 flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
          <span className="text-sm text-gray-600">검색 중...</span>
        </div>
      )}

      {/* AI 추천 채팅 모달 */}
      {showAIChat && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg h-[600px] max-h-[80vh] flex flex-col overflow-hidden">
            <ChatInterface
              onClose={() => setShowAIChat(false)}
              onSearch={(query) => {
                setShowAIChat(false);
                setSearchQuery(query);
                handleSearch(query);
              }}
              className="h-full"
            />
          </div>
        </div>
      )}

      {/* 장소 상세 정보 모달 */}
      {showDetail && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            {isLoadingDetail ? (
              <div className="flex flex-col items-center justify-center p-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                <p className="text-gray-600">장소 정보를 불러오는 중...</p>
              </div>
            ) : selectedPlace ? (
              <PlaceDetail
                place={selectedPlace}
                onClose={() => {
                  setShowDetail(false);
                  setSelectedPlace(null);
                }}
                className="h-full"
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-12">
                <p className="text-gray-600 mb-4">장소 정보를 불러올 수 없습니다.</p>
                <button
                  onClick={() => {
                    setShowDetail(false);
                    setSelectedPlace(null);
                  }}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  닫기
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};