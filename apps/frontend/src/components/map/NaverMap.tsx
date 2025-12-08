import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useMapStore } from '@/store/mapStore';
import { Place } from '@wonderland/shared';
import { loadNaverMapScript } from '@/utils/loadNaverMapScript';
import { createMarkerCluster, removeMarkerCluster } from '@/utils/markerClusterer';
import { SplashScreen } from '@/components/common/SplashScreen';

// Naver Maps 타입 선언
declare global {
  interface Window {
    naver: typeof naver;
  }
  namespace naver {
    namespace maps {
      class Map {
        constructor(element: HTMLElement, options?: MapOptions);
        getCenter(): LatLng;
        setCenter(latlng: LatLng): void;
        getZoom(): number;
        setZoom(level: number): void;
        getBounds(): LatLngBounds;
        fitBounds(bounds: LatLngBounds, padding?: object): void;
        destroy(): void;
      }
      
      class LatLng {
        constructor(lat: number, lng: number);
        lat(): number;
        lng(): number;
      }
      
      class LatLngBounds {
        constructor(sw?: LatLng, ne?: LatLng);
        getSW(): LatLng;
        getNE(): LatLng;
        extend(latlng: LatLng): void;
      }
      
      class Marker {
        constructor(options?: MarkerOptions);
        setMap(map: Map | null): void;
        getPosition(): LatLng;
      }
      
      class Point {
        constructor(x: number, y: number);
      }
      
      namespace Event {
        function addListener(target: object, eventName: string, handler: Function): void;
      }
      
      interface MapOptions {
        center?: LatLng;
        zoom?: number;
        zoomControl?: boolean;
        mapTypeControl?: boolean;
        scaleControl?: boolean;
        logoControl?: boolean;
        mapDataControl?: boolean;
        minZoom?: number;
        maxZoom?: number;
      }
      
      interface MarkerOptions {
        position?: LatLng;
        map?: Map | null;
        title?: string;
        icon?: object;
        zIndex?: number;
      }
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const MarkerClusterer: any;
      
      // Services namespace
      namespace services {
        class Places {
          search(options: unknown, callback: (status: unknown, response: unknown) => void): void;
        }
        const Status: {
          OK: string;
          ERROR: string;
        };
      }
    }
  }
}

interface NaverMapProps {
  className?: string;
  places?: Place[];
  onPlaceClick?: (place: Place) => void;
  onBoundsChange?: (bounds: {
    south: number;
    north: number;
    west: number;
    east: number;
  }) => void;
  enableAutoSearch?: boolean;
  fitBoundsOnSearch?: boolean; // 검색 결과에 맞게 지도 범위 조정 여부
}

export const NaverMap: React.FC<NaverMapProps> = ({
  className = '',
  places = [],
  onPlaceClick,
  onBoundsChange,
  enableAutoSearch = false,
  fitBoundsOnSearch = false,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const naverMapRef = useRef<naver.maps.Map | null>(null);
  const markersRef = useRef<naver.maps.Marker[]>([]);
  const currentLocationMarkerRef = useRef<naver.maps.Marker | null>(null);
  const clustererRef = useRef<any>(null);
  const prevPlacesLengthRef = useRef<number>(0); // 이전 places 개수 (fitBounds 판단용)
  const boundsChangeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [useClustering] = useState(true);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const splashStartTimeRef = useRef<number>(Date.now());
  
  const { setCenter, setZoom } = useMapStore();

  // 네이버 지도 스크립트 로드
  useEffect(() => {
    splashStartTimeRef.current = Date.now();
    
    loadNaverMapScript()
      .then(() => {
        setIsScriptLoaded(true);
      })
      .catch((error) => {
        console.error('네이버 지도 로드 실패:', error);
        setLoadError('네이버 지도를 로드할 수 없습니다. API 키를 확인해주세요.');
        // 에러 발생 시에도 2초 후 스플래시 숨김
        setTimeout(() => {
          setShowSplash(false);
        }, 2000);
      });
  }, []);


  // 지도 bounds 변경 핸들러 (디바운싱 적용)
  const handleBoundsChange = useCallback(() => {
    if (!naverMapRef.current || !enableAutoSearch) return;

    // 디바운싱: 500ms 후에 실행
    if (boundsChangeTimerRef.current) {
      clearTimeout(boundsChangeTimerRef.current);
    }

    boundsChangeTimerRef.current = setTimeout(() => {
      if (!naverMapRef.current) return;

      try {
        const bounds = naverMapRef.current.getBounds();
        const sw = bounds.getSW(); // 남서쪽
        const ne = bounds.getNE(); // 북동쪽

        const boundsData = {
          south: sw.lat(),
          north: ne.lat(),
          west: sw.lng(),
          east: ne.lng(),
        };

        if (onBoundsChange) {
          onBoundsChange(boundsData);
        }
      } catch (error) {
        console.warn('Bounds 가져오기 실패:', error);
      }
    }, 500);
  }, [enableAutoSearch, onBoundsChange]);

  // 지도 초기화 (한 번만 실행)
  useEffect(() => {
    // 이미 지도가 초기화되었으면 스킵
    if (naverMapRef.current) return;
    if (!mapRef.current || !isScriptLoaded || !window.naver?.maps) return;

    let isMounted = true;

    const initMap = async () => {
      try {
        // 현재 위치 가져오기
        let location = { lat: 37.5665, lng: 126.9780 }; // 기본값: 서울 시청
        
        if (navigator.geolocation) {
          setIsGettingLocation(true);
          try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0,
              });
            });
            location = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            };
          } catch (geoError) {
            console.warn('위치 정보를 가져올 수 없습니다:', geoError);
          } finally {
            if (isMounted) {
              setIsGettingLocation(false);
            }
          }
        }

        if (!isMounted || !mapRef.current) return;

        // 지도 생성
        const mapOptions = {
          center: new window.naver.maps.LatLng(location.lat, location.lng),
          zoom: 15,
          zoomControl: false,
          mapTypeControl: false,
          scaleControl: false,
          logoControl: false,
          mapDataControl: false,
          minZoom: 6,
          maxZoom: 21,
        };

        const map = new window.naver.maps.Map(mapRef.current, mapOptions);
        naverMapRef.current = map;

        // 중심점과 줌 레벨 업데이트
        setCenter({ lat: location.lat, lng: location.lng });
        setZoom(15);

        // 지도 이벤트 리스너
        window.naver.maps.Event.addListener(map, 'center_changed', () => {
          const center = map.getCenter();
          setCenter({ lat: center.lat(), lng: center.lng() });
        });

        window.naver.maps.Event.addListener(map, 'zoom_changed', () => {
          setZoom(map.getZoom());
        });

        // 지도 이동/줌 완료 후 bounds 변경 감지 (idle 이벤트)
        // idle: 지도의 이동이 완료되고 렌더링이 끝났을 때 발생
        window.naver.maps.Event.addListener(map, 'idle', () => {
          handleBoundsChange();
        });

        if (isMounted) {
          setIsMapLoaded(true);
          
          // 최소 2초 스플래시 표시
          const elapsedTime = Date.now() - splashStartTimeRef.current;
          const remainingTime = Math.max(0, 2000 - elapsedTime);
          
          setTimeout(() => {
            if (isMounted) {
              setShowSplash(false);
            }
          }, remainingTime);
        }
      } catch (error) {
        console.error('지도 초기화 실패:', error);
        if (isMounted) {
          setLoadError(`지도를 초기화할 수 없습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
          setIsMapLoaded(true);
          setTimeout(() => {
            setShowSplash(false);
          }, 2000);
        }
      }
    };

    initMap();

    return () => {
      isMounted = false;
      if (boundsChangeTimerRef.current) {
        clearTimeout(boundsChangeTimerRef.current);
      }
      if (currentLocationMarkerRef.current) {
        currentLocationMarkerRef.current.setMap(null);
        currentLocationMarkerRef.current = null;
      }
      if (clustererRef.current) {
        removeMarkerCluster(clustererRef.current);
        clustererRef.current = null;
      }
      if (naverMapRef.current) {
        naverMapRef.current.destroy();
        naverMapRef.current = null;
      }
    };
  }, [isScriptLoaded]); // 의존성 최소화

  // 마커 업데이트
  useEffect(() => {
    if (!naverMapRef.current || !isMapLoaded || !window.naver?.maps) return;

    // 기존 마커 및 클러스터 제거
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];
    
    if (clustererRef.current) {
      removeMarkerCluster(clustererRef.current);
      clustererRef.current = null;
    }

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
        map: useClustering ? null : naverMapRef.current!, // 클러스터링 사용 시 map은 null
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

    // 클러스터링 적용 (마커가 10개 이상일 때)
    if (useClustering && markersRef.current.length >= 10 && window.naver?.maps?.MarkerClusterer) {
      try {
        clustererRef.current = createMarkerCluster(
          naverMapRef.current,
          markersRef.current,
          {
            minClusterSize: 2,
            maxZoom: 18,
            gridSize: 60,
          }
        );
      } catch (error) {
        console.warn('마커 클러스터링 생성 실패:', error);
        // 클러스터링 실패 시 일반 마커로 표시
        markersRef.current.forEach(marker => {
          marker.setMap(naverMapRef.current!);
        });
      }
    } else if (!useClustering || markersRef.current.length < 10) {
      // 클러스터링 미사용 또는 마커가 적을 때 일반 마커로 표시
      markersRef.current.forEach(marker => {
        marker.setMap(naverMapRef.current!);
      });
    }

    // 지도 범위 조정: 새로운 검색 결과가 있고, fitBoundsOnSearch가 true일 때만
    // (places가 0 → N으로 변경되었을 때만 fitBounds 실행)
    const isNewSearch = prevPlacesLengthRef.current === 0 && places.length > 0;
    prevPlacesLengthRef.current = places.length;

    if (isNewSearch && fitBoundsOnSearch && places.length > 0) {
      const firstPlace = places[0];
      const firstLat = typeof firstPlace.latitude === 'string' 
        ? parseFloat(firstPlace.latitude) 
        : firstPlace.latitude;
      const firstLng = typeof firstPlace.longitude === 'string' 
        ? parseFloat(firstPlace.longitude) 
        : firstPlace.longitude;

      if (!isNaN(firstLat) && !isNaN(firstLng)) {
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
    }
  }, [places, isMapLoaded, onPlaceClick, useClustering, fitBoundsOnSearch]);

  // 현재 위치로 이동
  const moveToCurrentLocation = useCallback(() => {
    if (!navigator.geolocation || !naverMapRef.current) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const location = new window.naver.maps.LatLng(latitude, longitude);
        naverMapRef.current!.setCenter(location);
        naverMapRef.current!.setZoom(15);

        // 기존 현재 위치 마커 제거
        if (currentLocationMarkerRef.current) {
          currentLocationMarkerRef.current.setMap(null);
          currentLocationMarkerRef.current = null;
        }

        // 현재 위치 마커 추가
        currentLocationMarkerRef.current = new window.naver.maps.Marker({
          position: location,
          map: naverMapRef.current!,
          icon: {
            content: '<div style="width: 14px; height: 14px; background: #4285F4; border: 2px solid white; border-radius: 50%; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>',
            anchor: new window.naver.maps.Point(7, 7),
          },
          zIndex: 1000, // 다른 마커보다 위에 표시
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

  // 스플래시 메시지 결정
  const getSplashMessage = () => {
    if (!isScriptLoaded) return '지도 API를 불러오는 중...';
    if (isGettingLocation) return '현재 위치를 확인하는 중...';
    if (!isMapLoaded) return '지도를 초기화하는 중...';
    return '준비 중...';
  };

  return (
    <div className={`relative w-full h-full ${className}`}>
      {/* 지도 div는 항상 렌더링 */}
      <div ref={mapRef} className="w-full h-full" />
      
      {/* 스플래시 오버레이 */}
      {showSplash && (
        <div className="absolute inset-0 z-50">
          <SplashScreen message={getSplashMessage()} />
        </div>
      )}

      {/* 에러 오버레이 */}
      {loadError && !showSplash && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-40">
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
      )}
      
      {/* 현재 위치 버튼 (스플래시가 숨겨진 후에만 표시) */}
      {!showSplash && !loadError && (
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
      )}
    </div>
  );
};
