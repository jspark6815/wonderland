import { useState } from 'react';
import { aiSearchAPI } from '@/api/ai.api';

interface AISearchResult {
  response: string;
  searchQuery?: string;
  places?: any[];
}

export const useAISearch = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchWithAI = async (query: string): Promise<AISearchResult> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await aiSearchAPI(query);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    searchWithAI,
    isLoading,
    error,
  };
};
