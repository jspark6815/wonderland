import React from 'react';
import { Place } from '@wonderland/shared';
import { PlaceCard } from './PlaceCard';

interface PlaceListProps {
  places: Place[];
  isLoading: boolean;
  onPlaceClick: (place: Place) => void;
  className?: string;
}

export const PlaceList: React.FC<PlaceListProps> = ({
  places,
  isLoading,
  onPlaceClick,
  className = '',
}) => {
  if (isLoading) {
    return (
      <div className={`flex flex-col ${className}`}>
        {/* 로딩 스켈레톤 */}
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="p-4 border-b animate-pulse">
            <div className="flex gap-3">
              <div className="w-10 h-10 bg-gray-200 rounded-full" />
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (places.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center p-12 ${className}`}>
        <svg
          className="w-20 h-20 text-gray-300 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <h3 className="text-gray-700 font-medium mb-2">검색 결과가 없습니다</h3>
        <p className="text-gray-500 text-sm text-center">
          다른 검색어로 다시 시도해보세요
        </p>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {/* 결과 헤더 */}
      <div className="px-4 py-3 bg-gray-50 border-b sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">
            검색 결과 <span className="text-blue-600">{places.length}</span>건
          </h2>
          <button className="text-sm text-gray-600 hover:text-gray-800 flex items-center gap-1">
            <span>거리순</span>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* 장소 목록 */}
      <div className="divide-y">
        {places.map((place, index) => (
          <PlaceCard
            key={place.id}
            place={place}
            index={index + 1}
            onClick={() => onPlaceClick(place)}
          />
        ))}
      </div>

      {/* 더보기 버튼 (필요시) */}
      {places.length >= 10 && (
        <div className="p-4 border-t bg-gray-50">
          <button className="w-full py-2 text-sm text-gray-600 hover:text-blue-600 font-medium">
            더 많은 결과 보기
          </button>
        </div>
      )}
    </div>
  );
};
