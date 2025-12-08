import React from 'react';
import { Place } from '@wonderland/shared';

interface PlaceDetailProps {
  place: Place;
  onClose: () => void;
  className?: string;
}

export const PlaceDetail: React.FC<PlaceDetailProps> = ({
  place,
  onClose,
  className = '',
}) => {
  return (
    <div className={`flex flex-col ${className}`}>
      {/* 헤더 */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-xl font-bold text-gray-900">{place.name}</h2>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="닫기"
        >
          <svg
            className="w-6 h-6 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* 콘텐츠 */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* 카테고리 및 평점 */}
        <div className="flex items-center gap-4 mb-4">
          {place.category && (
            <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-sm">
              {place.category}
            </span>
          )}
          
          {place.rating && (
            <div className="flex items-center gap-1">
              <svg
                className="w-5 h-5 text-yellow-400 fill-current"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="font-semibold">{place.rating}</span>
              {place.reviewCount && (
                <span className="text-gray-500">({place.reviewCount}개 리뷰)</span>
              )}
            </div>
          )}

          {place.isOpen !== undefined && (
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                place.isOpen
                  ? 'bg-green-50 text-green-600'
                  : 'bg-red-50 text-red-600'
              }`}
            >
              {place.isOpen ? '영업중' : '영업종료'}
            </span>
          )}
        </div>

        {/* 주소 */}
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-2">주소</h3>
          <p className="text-gray-600">{place.address}</p>
          {place.roadAddress && (
            <p className="text-gray-500 text-sm mt-1">도로명: {place.roadAddress}</p>
          )}
        </div>

        {/* 전화번호 */}
        {place.phone && (
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-2">전화번호</h3>
            <a
              href={`tel:${place.phone}`}
              className="text-blue-600 hover:underline"
            >
              {place.phone}
            </a>
          </div>
        )}

        {/* 설명 */}
        {place.description && (
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-2">설명</h3>
            <p className="text-gray-600 whitespace-pre-wrap">{place.description}</p>
          </div>
        )}

        {/* 영업시간 */}
        {place.businessHours && (
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-2">영업시간</h3>
            <div className="space-y-1 text-sm">
              {Object.entries(place.businessHours).map(([day, hours]) => (
                <div key={day} className="flex justify-between">
                  <span className="text-gray-600 capitalize">{day}</span>
                  <span className="text-gray-900">
                    {typeof hours === 'string' 
                      ? hours 
                      : hours && typeof hours === 'object' && 'open' in hours && 'close' in hours
                        ? `${hours.open} - ${hours.close}`
                        : '-'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 태그 */}
        {place.tags && place.tags.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-2">태그</h3>
            <div className="flex flex-wrap gap-2">
              {place.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 하단 버튼 */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          <button className="flex-1 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
            길찾기
          </button>
          <button className="flex-1 py-2 border border-blue-500 text-blue-500 rounded-lg hover:bg-blue-50 transition-colors">
            공유하기
          </button>
        </div>
      </div>
    </div>
  );
};
