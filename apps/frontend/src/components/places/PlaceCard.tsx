import React, { useState } from 'react';
import { Place } from '@wonderland/shared';

interface PlaceCardProps {
  place: Place;
  index: number;
  onClick: () => void;
  className?: string;
}

// 카테고리별 기본 이미지 (SVG placeholder)
const getCategoryIcon = (category?: string) => {
  const cat = category?.toUpperCase() || '';
  if (cat.includes('CAFE') || cat.includes('카페')) {
    return '☕';
  } else if (cat.includes('RESTAURANT') || cat.includes('음식')) {
    return '🍽️';
  } else if (cat.includes('SHOPPING') || cat.includes('쇼핑')) {
    return '🛍️';
  } else if (cat.includes('CULTURE') || cat.includes('문화')) {
    return '🎭';
  } else if (cat.includes('HEALTHCARE') || cat.includes('병원')) {
    return '🏥';
  } else if (cat.includes('CONVENIENCE') || cat.includes('편의')) {
    return '🏪';
  } else if (cat.includes('ACCOMMODATION') || cat.includes('숙박')) {
    return '🏨';
  }
  return '📍';
};

// 카테고리 한글 변환
const formatCategory = (category?: string) => {
  if (!category) return '';
  // "카페,디저트>베이커리" 형태에서 마지막 부분만 추출
  const parts = category.split('>');
  return parts[parts.length - 1]?.trim() || category;
};

export const PlaceCard: React.FC<PlaceCardProps> = ({
  place,
  index,
  onClick,
  className = '',
}) => {
  const [imageError, setImageError] = useState(false);
  const hasValidImage = place.images && place.images.length > 0 && !imageError;

  return (
    <div
      onClick={onClick}
      className={`
        bg-white p-3 hover:bg-blue-50 transition-all cursor-pointer border-b border-gray-100
        hover:shadow-sm group
        ${className}
      `}
    >
      <div className="flex gap-3">
        {/* 이미지 영역 */}
        <div className="flex-shrink-0 relative">
          {hasValidImage ? (
            <img
              src={place.images![0]}
              alt={place.name}
              onError={() => setImageError(true)}
              className="w-20 h-20 rounded-xl object-cover shadow-sm group-hover:shadow-md transition-shadow"
            />
          ) : (
            <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center shadow-sm">
              <span className="text-3xl">{getCategoryIcon(place.category)}</span>
            </div>
          )}
          {/* 인덱스 배지 */}
          <div className="absolute -top-1 -left-1 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-md">
            {index}
          </div>
        </div>

        {/* 장소 정보 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 text-[15px] leading-tight truncate group-hover:text-blue-600 transition-colors">
                {place.name}
              </h3>
              
              {/* 카테고리 및 거리 */}
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                {place.category && (
                  <span className="inline-flex items-center px-2 py-0.5 text-xs bg-blue-50 text-blue-600 rounded-full">
                    {formatCategory(place.category)}
                  </span>
                )}
                {place.distance !== undefined && place.distance > 0 && (
                  <span className="text-xs text-gray-500">
                    {place.distance < 1000
                      ? `${Math.round(place.distance)}m`
                      : `${(place.distance / 1000).toFixed(1)}km`}
                  </span>
                )}
              </div>
            </div>

            {/* 평점 */}
            {place.rating && (
              <div className="flex items-center gap-0.5 flex-shrink-0 bg-yellow-50 px-2 py-1 rounded-lg">
                <svg
                  className="w-3.5 h-3.5 text-yellow-400 fill-current"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span className="text-xs font-semibold text-gray-800">{place.rating}</span>
              </div>
            )}
          </div>
          
          {/* 주소 */}
          <p className="mt-1 text-xs text-gray-500 leading-tight truncate">
            {place.address}
          </p>

          {/* 하단 정보 */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2">
              {place.isOpen !== undefined && (
                <span
                  className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                    place.isOpen 
                      ? 'bg-green-50 text-green-600' 
                      : 'bg-red-50 text-red-500'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${place.isOpen ? 'bg-green-500' : 'bg-red-400'}`}></span>
                  {place.isOpen ? '영업중' : '영업종료'}
                </span>
              )}
            </div>

            {/* 전화번호 아이콘 */}
            {place.phone && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = `tel:${place.phone}`;
                }}
                className="p-1.5 rounded-full hover:bg-blue-100 text-gray-400 hover:text-blue-500 transition-colors"
                title={place.phone}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </button>
            )}
          </div>

          {/* 태그 */}
          {place.tags && place.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {place.tags.slice(0, 3).map((tag, idx) => (
                <span
                  key={idx}
                  className="inline-block px-1.5 py-0.5 text-[10px] bg-gray-100 text-gray-500 rounded"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};