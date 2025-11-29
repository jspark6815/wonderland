import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MapMarker } from './MapMarker';
import { useMapStore } from '@/store/mapStore';
import { Place } from '@wonderland/shared';
import { loadNaverMapScript } from '@/utils/loadNaverMapScript';

interface NaverMapProps {
  className?: string;
  places?: Place[];
  onPlaceClick?: (place: Place) => void;
}

export const NaverMap: React.FC<NaverMapProps> = ({
  className = '',
  places = [],
  onPlaceClick,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const naverMapRef = useRef<naver.maps.Map | null>(null);
  const markersRef = useRef<naver.maps.Marker[]>([]);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  const { center, zoom, setCenter, setZoom } = useMapStore();

  // 네이버 지도 스크립트 로드
  useEffect(() => {
    loadNaverMapScript()
      .then(() => {
        setIsScriptLoaded(true);
      })
      .catch((error) => {
        console.error('네이버 지도 로드 실패:', error);
        setLoadError('네이버 지도를 로드할 수 없습니다. API 키를 확인해주세요.');
      });
  }, []);

  // 지도 초기화
  useEffect(() => {
    if (!mapRef.current || !isScriptLoaded || !window.naver?.maps) return;

    const mapOptions = {
      center: new window.naver.maps.LatLng(center.lat, center.lng),
      zoom: zoom,
      zoomControl: false, // 커스텀 컨트롤 사용
      mapTypeControl: false,
      scaleControl: false,
      logoControl: false,
      mapDataControl: false,
      minZoom: 6,
      maxZoom: 21,
    };

    const map = new window.naver.maps.Map(mapRef.current, mapOptions);
    naverMapRef.current = map;

    // 지도 이벤트 리스너
    window.naver.maps.Event.addListener(map, 'center_changed', () => {
      const center = map.getCenter();
      setCenter({ lat: center.lat(), lng: center.lng() });
    });

    window.naver.maps.Event.addListener(map, 'zoom_changed', () => {
      setZoom(map.getZoom());
    });

    setIsMapLoaded(true);

    return () => {
      if (naverMapRef.current) {
        naverMapRef.current.destroy();
        naverMapRef.current = null;
      }
    };
  }, [isScriptLoaded]); // isScriptLoaded를 의존성에 추가

  // 마커 업데이트
  useEffect(() => {
    if (!naverMapRef.current || !isMapLoaded || !window.naver?.maps) return;

    // 기존 마커 제거
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // 새 마커 추가
    places.forEach((place, index) => {
      // 위도/경도 값 확인 및 변환
      const lat = typeof place.latitude === 'string' 
        ? parseFloat(place.latitude) 
        : place.latitude;
      const lng = typeof place.longitude === 'string' 
        ? parseFloat(place.longitude) 
        : place.longitude;

      if (isNaN(lat) || isNaN(lng)) {
        console.error(`Invalid coordinates for place: ${place.name}`, { lat, lng });
        return;
      }

      const marker = new window.naver.maps.Marker({
        position: new window.naver.maps.LatLng(lat, lng),
        map: naverMapRef.current!,
        title: place.name,
        icon: {
          content: `
            <div style="position: relative; width: 40px; height: 50px;">
              <div style="
                position: absolute;
                top: 0;
                left: 50%;
                transform: translateX(-50%);
                background: #3B82F6;
                color: white;
                padding: 4px 8px;
                border-radius: 8px;
                font-size: 12px;
                font-weight: bold;
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                white-space: nowrap;
                z-index: 1;
              ">
                ${index + 1}
              </div>
              <div style="
                position: absolute;
                bottom: 0;
                left: 50%;
                transform: translateX(-50%);
                width: 12px;
                height: 12px;
                background: #3B82F6;
                border: 2px solid white;
                border-radius: 50%;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
              "></div>
              <div style="
                position: absolute;
                bottom: 2px;
                left: 50%;
                transform: translateX(-50%);
                width: 2px;
                height: 20px;
                background: #3B82F6;
              "></div>
            </div>
          `,
          anchor: new window.naver.maps.Point(20, 50),
        },
      });

      // 마커 클릭 이벤트
      window.naver.maps.Event.addListener(marker, 'click', () => {
        if (onPlaceClick) {
          onPlaceClick(place);
        }
      });

      markersRef.current.push(marker);
    });

    // 모든 마커가 보이도록 지도 범위 조정
    if (places.length > 0) {
      const firstPlace = places[0];
      const firstLat = typeof firstPlace.latitude === 'string' 
        ? parseFloat(firstPlace.latitude) 
        : firstPlace.latitude;
      const firstLng = typeof firstPlace.longitude === 'string' 
        ? parseFloat(firstPlace.longitude) 
        : firstPlace.longitude;

      const bounds = new window.naver.maps.LatLngBounds(
        new window.naver.maps.LatLng(firstLat, firstLng),
        new window.naver.maps.LatLng(firstLat, firstLng)
      );

      places.forEach(place => {
        const lat = typeof place.latitude === 'string' 
          ? parseFloat(place.latitude) 
          : place.latitude;
        const lng = typeof place.longitude === 'string' 
          ? parseFloat(place.longitude) 
          : place.longitude;
        
        if (!isNaN(lat) && !isNaN(lng)) {
          bounds.extend(new window.naver.maps.LatLng(lat, lng));
        }
      });

      // 지도 범위 조정 (여백 추가)
      naverMapRef.current.fitBounds(bounds, { 
        top: 50, 
        right: 50, 
        bottom: 50, 
        left: 50 
      });
    }
  }, [places, isMapLoaded, onPlaceClick]);

  // 현재 위치로 이동
  const moveToCurrentLocation = useCallback(() => {
    if (!navigator.geolocation || !naverMapRef.current) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const location = new window.naver.maps.LatLng(latitude, longitude);
        naverMapRef.current!.setCenter(location);
        naverMapRef.current!.setZoom(15);

        // 현재 위치 마커 추가
        new window.naver.maps.Marker({
          position: location,
          map: naverMapRef.current!,
          icon: {
            content: '<div style="width: 14px; height: 14px; background: #4285F4; border: 2px solid white; border-radius: 50%; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>',
            anchor: new window.naver.maps.Point(7, 7),
          },
        });
      },
      (error) => {
        console.error('위치 정보를 가져올 수 없습니다:', error);
        alert('현재 위치를 가져올 수 없습니다. 위치 권한을 확인해주세요.');
      }
    );
  }, []);

  // 줌 컨트롤
  const handleZoomIn = useCallback(() => {
    if (!naverMapRef.current) return;
    const currentZoom = naverMapRef.current.getZoom();
    naverMapRef.current.setZoom(Math.min(currentZoom + 1, 21));
  }, []);

  const handleZoomOut = useCallback(() => {
    if (!naverMapRef.current) return;
    const currentZoom = naverMapRef.current.getZoom();
    naverMapRef.current.setZoom(Math.max(currentZoom - 1, 6));
  }, []);

  // 이벤트 리스너들
  useEffect(() => {
    const handleMoveToCurrentLocation = () => {
      moveToCurrentLocation();
    };
    const handleZoomInEvent = () => {
      handleZoomIn();
    };
    const handleZoomOutEvent = () => {
      handleZoomOut();
    };

    window.addEventListener('moveToCurrentLocation', handleMoveToCurrentLocation);
    window.addEventListener('zoomIn', handleZoomInEvent);
    window.addEventListener('zoomOut', handleZoomOutEvent);
    
    return () => {
      window.removeEventListener('moveToCurrentLocation', handleMoveToCurrentLocation);
      window.removeEventListener('zoomIn', handleZoomInEvent);
      window.removeEventListener('zoomOut', handleZoomOutEvent);
    };
  }, [moveToCurrentLocation, handleZoomIn, handleZoomOut]);

  // 에러 상태 표시
  if (loadError) {
    return (
      <div className={`relative w-full h-full flex items-center justify-center bg-gray-100 ${className}`}>
        <div className="text-center p-4">
          <svg
            className="w-16 h-16 text-gray-400 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-gray-600 mb-2">{loadError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            새로고침
          </button>
        </div>
      </div>
    );
  }

  // 로딩 상태 표시
  if (!isScriptLoaded) {
    return (
      <div className={`relative w-full h-full flex items-center justify-center bg-gray-100 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">지도를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full ${className}`}>
      <div ref={mapRef} className="w-full h-full" />
      
      {/* 현재 위치 버튼 */}
      <button
        onClick={moveToCurrentLocation}
        className="absolute bottom-4 right-4 bg-white p-3 rounded-full shadow-lg hover:shadow-xl transition-shadow z-10"
        aria-label="현재 위치로 이동"
      >
        <svg
          className="w-6 h-6 text-gray-700"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      </button>
    </div>
  );
};
