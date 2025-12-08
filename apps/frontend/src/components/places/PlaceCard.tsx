import React from 'react';
import { Place } from '@wonderland/shared';

interface PlaceCardProps {
  place: Place;
  index: number;
  onClick: () => void;
  className?: string;
}

export const PlaceCard: React.FC<PlaceCardProps> = ({
  place,
  index,
  onClick,
  className = '',
}) => {
  return (
    <div
      onClick={onClick}
      className={`
        bg-white p-4 hover:bg-gray-50 transition-colors cursor-pointer
        ${className}
      `}
    >
      <div className="flex gap-3">
        {/* 인덱스 마커 */}
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-sm">
            {index}
          </div>
        </div>

        {/* 장소 정보 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 text-[15px] leading-tight">
                {place.name}
              </h3>
              
              {/* 카테고리 및 거리 */}
              <div className="flex items-center gap-2 mt-1">
                {place.category && (
                  <span className="text-xs text-gray-600">
                    {place.category}
                  </span>
                )}
                {place.category && place.distance && (
                  <span className="text-xs text-gray-400">•</span>
                )}
                {place.distance && (
                  <span className="text-xs text-gray-600">
                    {place.distance < 1000
                      ? `${place.distance}m`
                      : `${(place.distance / 1000).toFixed(1)}km`}
                  </span>
                )}
              </div>
            </div>

            {/* 평점 */}
            {place.rating && (
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <svg
                  className="w-4 h-4 text-yellow-400 fill-current"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span className="text-sm font-medium text-gray-900">{place.rating}</span>
              </div>
            )}
          </div>
          
          {/* 주소 */}
          <p className="mt-1.5 text-sm text-gray-600 leading-tight">
            {place.address}
          </p>

          {/* 추가 정보 */}
          <div className="flex items-center gap-3 mt-2">
            {place.phone && (
              <span className="text-xs text-gray-500">
                {place.phone}
              </span>
            )}
            
            {place.isOpen !== undefined && (
              <span
                className={`text-xs font-medium ${
                  place.isOpen ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {place.isOpen ? '영업중' : '영업종료'}
              </span>
            )}
          </div>

          {/* 태그 */}
          {place.tags && place.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {place.tags.slice(0, 3).map((tag, idx) => (
                <span
                  key={idx}
                  className="inline-block px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 이미지 (있을 경우) */}
        {place.images && place.images.length > 0 && (
          <div className="flex-shrink-0">
            <img
              src={place.images[0]}
              alt={place.name}
              className="w-16 h-16 rounded-lg object-cover"
            />
          </div>
        )}
      </div>
    </div>
  );
};