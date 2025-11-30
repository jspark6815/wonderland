import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface MapState {
  // 지도 중심 좌표
  center: {
    lat: number;
    lng: number;
  };
  // 지도 줌 레벨
  zoom: number;
  // 선택된 장소 ID
  selectedPlaceId: string | null;
  // 검색 반경 (meters)
  searchRadius: number;
  // 지도 모드
  mapMode: 'default' | 'satellite' | 'terrain';
  
  // Actions
  setCenter: (center: { lat: number; lng: number }) => void;
  setZoom: (zoom: number) => void;
  setSelectedPlaceId: (id: string | null) => void;
  setSearchRadius: (radius: number) => void;
  setMapMode: (mode: 'default' | 'satellite' | 'terrain') => void;
  resetMap: () => void;
}

const initialState = {
  center: {
    lat: 37.5665, // 서울시청
    lng: 126.9780,
  },
  zoom: 13,
  selectedPlaceId: null,
  searchRadius: 1000,
  mapMode: 'default' as const,
};

export const useMapStore = create<MapState>()(
  devtools(
    (set) => ({
      ...initialState,
      
      setCenter: (center) => set({ center }),
      
      setZoom: (zoom) => set({ zoom }),
      
      setSelectedPlaceId: (selectedPlaceId) => set({ selectedPlaceId }),
      
      setSearchRadius: (searchRadius) => set({ searchRadius }),
      
      setMapMode: (mapMode) => set({ mapMode }),
      
      resetMap: () => set(initialState),
    }),
    {
      name: 'map-store',
    }
  )
);
