import React from 'react';

interface MapMarkerProps {
  index: number;
  isSelected?: boolean;
}

export const MapMarker: React.FC<MapMarkerProps> = ({ index, isSelected = false }) => {
  return (
    <div className="relative">
      <div
        className={`
          absolute -top-10 -left-4 px-2 py-1 rounded-lg shadow-lg
          ${isSelected ? 'bg-red-500' : 'bg-blue-500'}
          text-white
        `}
      >
        <div className="text-xs font-semibold">{index}</div>
      </div>
      <div
        className={`
          w-8 h-8 rounded-full border-2 border-white shadow-lg
          ${isSelected ? 'bg-red-500' : 'bg-blue-500'}
        `}
      />
    </div>
  );
};
