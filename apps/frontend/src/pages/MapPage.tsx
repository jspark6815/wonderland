import React, { useState, useCallback, useEffect, useRef } from 'react';
import { NaverMap } from '@/components/map/NaverMap';
import { PlaceList } from '@/components/places/PlaceList';
import { PlaceDetail } from '@/components/places/PlaceDetail';
import { ChatInterface, ChatMessage, createInitialMessages } from '@/components/ai/ChatInterface';
import { UserMenu } from '@/components/auth';
import { useIntegratedSearch } from '@/hooks/useIntegratedSearch';
import { useAuthStore } from '@/store/authStore';
import { Place } from '@wonderland/shared';
import { 
  searchPlacesByBoundsAPI, 
  getPlaceDetailByLocationAPI, 
  getPlaceDetailAPI,
  getLastSearchHistoryAPI,
  SearchHistoryItem,
} from '@/api/places.api';

export const MapPage: React.FC = () => {
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSidebar, setShowSidebar] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  // isAutoSearching 제거 - isSearching으로 통합
  const [autoSearchPlaces, setAutoSearchPlaces] = useState<Place[]>([]);
  const [searchResults, setSearchResults] = useState<Place[]>([]); // 검색 결과 별도 관리
  const [isSearching, setIsSearching] = useState(false);
  const [showResearchButton, setShowResearchButton] = useState(false); // 재검색 버튼 표시 여부
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // 현재 지도 중심 좌표 (검색 시 위치 기반 필터링에 사용)
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({
    lat: 37.5665, // 기본값: 서울시청
    lng: 126.9780,
  });
  
  // 현재 지도 bounds (검색 시 영역 기반 필터링에 사용)
  const [mapBounds, setMapBounds] = useState<{
    south: number;
    north: number;
    west: number;
    east: number;
  } | null>(null);
  
  // AI Chat 상태 (부모에서 관리하여 multi-turn 대화 유지)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(createInitialMessages());
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  
  // 마지막 검색 기록 표시
  const [lastSearch, setLastSearch] = useState<SearchHistoryItem | null>(null);
  const [showLastSearchBanner, setShowLastSearchBanner] = useState(false);
  
  // Auth 상태
  const { isAuthenticated, user } = useAuthStore();
  const prevAuthRef = useRef(isAuthenticated);
  
  const { search } = useIntegratedSearch();
  
  // 로그인 시 마지막 검색 기록 불러오기
  useEffect(() => {
    // 로그인 상태가 false -> true로 변경된 경우에만 실행
    if (isAuthenticated && !prevAuthRef.current) {
      getLastSearchHistoryAPI()
        .then((history) => {
          if (history) {
            setLastSearch(history);
            setShowLastSearchBanner(true);
            // 5초 후 자동으로 배너 숨기기
            setTimeout(() => setShowLastSearchBanner(false), 8000);
          }
        })
        .catch(() => {
          // 검색 기록 조회 실패 (무시)
        });
    }
    prevAuthRef.current = isAuthenticated;
  }, [isAuthenticated]);

  // 검색 실행 (현재 지도 영역 기반 + 키워드 필터링)
  const handleSearch = useCallback(async (query: string, category?: string | null) => {
    if (!query.trim()) return;
    
    setSearchQuery(query);
    setShowSidebar(true);
    setIsSearching(true);
    setShowResearchButton(false); // 검색하면 재검색 버튼 숨기기
    
    try {
      let results: Place[] = [];
      
      // 1. bounds 기반으로 장소 검색 (현재 지도 영역)
      if (mapBounds) {
        const boundsResults = await searchPlacesByBoundsAPI(
          mapBounds,
          category || undefined,
          100
        );
        
        // 2. 키워드로 클라이언트 사이드 필터링
        const queryLower = query.toLowerCase();
        results = boundsResults.filter(place => 
          place.name?.toLowerCase().includes(queryLower) ||
          place.address?.toLowerCase().includes(queryLower) ||
          place.category?.toLowerCase().includes(queryLower) ||
          place.tags?.some(tag => tag.toLowerCase().includes(queryLower))
        );
      }
      
      // 3. bounds 검색 결과가 없으면 DB 전체 검색 시도
      if (results.length === 0) {
        const dbResults = await search(query, {
          category,
          lat: mapCenter.lat,
          lng: mapCenter.lng,
          radius: 10000, // 10km로 확대
        });
        results = dbResults.places;
      }
      
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [search, mapCenter, mapBounds]);

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
    } catch {
      // 상세 정보 조회 실패 시 기본 정보 표시
      setSelectedPlace(place);
    } finally {
      setIsLoadingDetail(false);
    }
  }, []);

  // 지도 영역 변경 시 bounds 업데이트 + 재검색 버튼 표시
  const handleBoundsChange = useCallback(async (bounds: {
    south: number;
    north: number;
    west: number;
    east: number;
  }) => {
    // 지도 중심 좌표 및 bounds 업데이트
    const newCenter = {
      lat: (bounds.south + bounds.north) / 2,
      lng: (bounds.west + bounds.east) / 2,
    };
    setMapCenter(newCenter);
    setMapBounds(bounds);
    
    // 검색어 또는 카테고리 필터가 있으면 "이 지역에서 재검색" 버튼 표시
    if (searchQuery.trim() || selectedCategory) {
      setShowResearchButton(true);
    }
  }, [searchQuery, selectedCategory]);

  // 이 지역에서 재검색
  const handleResearch = useCallback(async () => {
    if (!mapBounds) return;
    
    setShowResearchButton(false);
    setIsSearching(true);
    
    try {
      const boundsResults = await searchPlacesByBoundsAPI(
        mapBounds,
        selectedCategory || undefined,
        100
      );
      
      // 검색어가 있으면 키워드로 필터링
      if (searchQuery.trim()) {
        const queryLower = searchQuery.toLowerCase();
        const filtered = boundsResults.filter(place => 
          place.name?.toLowerCase().includes(queryLower) ||
          place.address?.toLowerCase().includes(queryLower) ||
          place.category?.toLowerCase().includes(queryLower) ||
          place.tags?.some(tag => tag.toLowerCase().includes(queryLower))
        );
        setSearchResults(filtered);
        setShowSidebar(filtered.length > 0);
      } else {
        // 카테고리 필터만 있으면 전체 결과 표시
        setAutoSearchPlaces(boundsResults);
      }
    } catch {
      // 검색 실패 시 무시
    } finally {
      setIsSearching(false);
    }
  }, [mapBounds, searchQuery, selectedCategory]);

  // 검색 초기화
  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setShowSidebar(false);
    setShowResearchButton(false);
  }, []);

  // 카테고리 변경 시 재검색
  useEffect(() => {
    if (searchQuery.trim()) {
      // 검색어가 있으면 새 카테고리로 재검색
      handleSearch(searchQuery, selectedCategory);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory]);

  // 표시할 장소 목록 (검색 결과 > 자동 검색 결과)
  const displayPlaces = searchResults.length > 0 ? searchResults : autoSearchPlaces;

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
        enableAutoSearch={!searchQuery.trim() && !selectedCategory}
        fitBoundsOnSearch={false} // 검색해도 지도 이동 안함 (사용자가 보고 있는 영역 유지)
        className="w-full h-full"
      />

      {/* 마지막 검색 기록 배너 */}
      {showLastSearchBanner && lastSearch && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-full max-w-xl px-4 z-40 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl shadow-lg px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3 text-white">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-white/80">환영합니다, {user?.name || '회원'}님! 마지막 검색:</p>
                <p className="font-medium">"{lastSearch.query}"</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setSearchQuery(lastSearch.query);
                  handleSearch(lastSearch.query, lastSearch.category);
                  setShowLastSearchBanner(false);
                }}
                className="px-3 py-1.5 bg-white text-blue-600 text-sm font-medium rounded-lg hover:bg-blue-50 transition-colors"
              >
                다시 검색
              </button>
              <button
                onClick={() => setShowLastSearchBanner(false)}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 상단 검색바 */}
      <div className={`absolute ${showLastSearchBanner && lastSearch ? 'top-20' : 'top-4'} left-1/2 -translate-x-1/2 w-full max-w-xl px-4 z-30 transition-all duration-300`}>
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* 메인 검색바 */}
          <div className="flex items-center">
            {/* 검색 입력 영역 */}
            <div className="flex-1 flex items-center px-4 py-1">
              <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch(searchQuery, selectedCategory);
                  }
                }}
                placeholder="장소, 주소 검색"
                className="flex-1 px-3 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="p-1.5 hover:bg-gray-100 rounded-full transition-colors mr-1"
                >
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
              {/* 검색 버튼 (input 내부) */}
              <button
                onClick={() => handleSearch(searchQuery, selectedCategory)}
                disabled={!searchQuery.trim()}
                className="px-3 py-1.5 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                검색
              </button>
            </div>
            
            {/* AI 추천 버튼 (오른쪽 끝) */}
            <button
              onClick={() => setShowAIChat(true)}
              className="px-4 py-3.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-medium hover:from-blue-600 hover:to-indigo-600 transition-all flex items-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 3L13.5 8.5L19 10L13.5 11.5L12 17L10.5 11.5L5 10L10.5 8.5L12 3Z" fill="currentColor" />
                <path d="M19 3L19.5 4.5L21 5L19.5 5.5L19 7L18.5 5.5L17 5L18.5 4.5L19 3Z" fill="currentColor" />
                <path d="M5 17L5.5 18.5L7 19L5.5 19.5L5 21L4.5 19.5L3 19L4.5 18.5L5 17Z" fill="currentColor" />
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
      {showSidebar && (searchResults.length > 0 || isSearching) && (
        <div className="absolute top-24 left-4 w-80 max-h-[calc(100vh-120px)] bg-white rounded-xl shadow-xl z-20 flex flex-col overflow-hidden">
          {/* 헤더 */}
          <div className="flex items-center justify-between p-3 border-b bg-gray-50">
            <div>
              <h3 className="font-semibold text-gray-900">검색 결과</h3>
              <p className="text-sm text-gray-500">
                {isSearching ? '검색 중...' : `${searchResults.length}개의 장소`}
              </p>
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
              places={searchResults}
              isLoading={isSearching}
              onPlaceClick={handlePlaceSelect}
            />
          </div>
        </div>
      )}

      {/* 사용자 메뉴 (우측 상단) */}
      <div className="absolute top-4 right-4 z-30">
        <UserMenu />
      </div>

      {/* 지도 컨트롤 (우측 하단) - 줌 + 현재위치 */}
      <div className="absolute bottom-6 right-6 flex flex-col gap-2 z-20">
        {/* 줌 컨트롤 */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <button 
            onClick={() => {
              const event = new CustomEvent('zoomIn');
              window.dispatchEvent(event);
            }}
            className="p-3 hover:bg-gray-100 transition-colors border-b flex items-center justify-center"
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
            className="p-3 hover:bg-gray-100 transition-colors flex items-center justify-center"
            title="축소"
          >
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
        </div>

        {/* 현재 위치 버튼 */}
        <button
          onClick={() => {
            const event = new CustomEvent('moveToCurrentLocation');
            window.dispatchEvent(event);
          }}
          className="bg-white p-3 rounded-xl shadow-lg hover:shadow-xl transition-all group flex items-center justify-center"
          title="현재 위치"
        >
          <svg className="w-5 h-5 text-blue-500 group-hover:text-blue-600" fill="currentColor" viewBox="0 0 24 24">
            <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* 이 지역에서 재검색 버튼 */}
      {showResearchButton && !isSearching && (
        <div className="absolute top-40 left-1/2 -translate-x-1/2 z-30">
          <button
            onClick={handleResearch}
            className="bg-white px-4 py-2.5 rounded-full shadow-lg hover:shadow-xl transition-all flex items-center gap-2 border border-gray-200 hover:border-blue-300"
          >
            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="text-sm font-medium text-gray-700">이 지역에서 재검색</span>
          </button>
        </div>
      )}

      {/* 로딩 인디케이터 */}
      {isSearching && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white px-4 py-2 rounded-full shadow-lg z-20 flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
          <span className="text-sm text-gray-600">검색 중...</span>
        </div>
      )}

      {/* AI 추천 채팅 모달 - 상태는 부모에서 관리 (multi-turn 대화 유지) */}
      {showAIChat && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg h-[600px] max-h-[80vh] flex flex-col overflow-hidden">
            <ChatInterface
              onClose={() => setShowAIChat(false)}
              onSearch={(query) => {
                setShowAIChat(false);
                setSearchQuery(query);
                handleSearch(query, selectedCategory);
              }}
              className="h-full"
              messages={chatMessages}
              setMessages={setChatMessages}
              input={chatInput}
              setInput={setChatInput}
              isLoading={isChatLoading}
              setIsLoading={setIsChatLoading}
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