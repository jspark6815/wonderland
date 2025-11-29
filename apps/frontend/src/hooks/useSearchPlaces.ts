import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Place } from '@wonderland/shared';
import { searchPlacesAPI } from '@/api/places.api';

export const useSearchPlaces = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [places, setPlaces] = useState<Place[]>([]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['places', searchQuery],
    queryFn: () => searchPlacesAPI(searchQuery),
    enabled: false,
  });

  const searchPlaces = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      const result = await refetch();
      if (result.data) {
        setPlaces(result.data);
      }
    } else {
      setPlaces([]);
    }
  }, [refetch]);

  return {
    places: data || places,
    isLoading,
    error,
    searchPlaces,
  };
};
