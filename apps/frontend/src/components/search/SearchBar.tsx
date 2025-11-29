import React, { useState, KeyboardEvent } from 'react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: (query: string) => void;
  placeholder?: string;
  className?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  onSearch,
  placeholder = '검색어를 입력하세요',
  className = '',
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && value.trim()) {
      onSearch(value.trim());
    }
  };

  const handleClear = () => {
    onChange('');
  };

  return (
    <div
      className={`
        relative flex items-center bg-white rounded-full
        border-2 transition-all duration-200
        ${isFocused ? 'border-blue-500 shadow-lg' : 'border-gray-200'}
        ${className}
      `}
    >
      {/* 검색 아이콘 */}
      <div className="pl-4 pr-2">
        <svg
          className="w-5 h-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      {/* 검색 입력 필드 */}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyPress={handleKeyPress}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        className="
          flex-1 py-3 pr-2 text-gray-700 placeholder-gray-400
          focus:outline-none bg-transparent
        "
      />

      {/* 클리어 버튼 */}
      {value && (
        <button
          onClick={handleClear}
          className="pr-2 hover:opacity-70 transition-opacity"
          aria-label="검색어 지우기"
        >
          <svg
            className="w-5 h-5 text-gray-400"
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
      )}

      {/* 검색 버튼 */}
      <button
        onClick={() => value.trim() && onSearch(value.trim())}
        className="
          px-6 py-3 bg-blue-500 text-white rounded-r-full
          hover:bg-blue-600 transition-colors
          disabled:bg-gray-300 disabled:cursor-not-allowed
        "
        disabled={!value.trim()}
        aria-label="검색"
      >
        검색
      </button>
    </div>
  );
};
