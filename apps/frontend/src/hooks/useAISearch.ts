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
    } catch (err: any) {
      let errorMessage = '알 수 없는 오류가 발생했습니다.';
      
      if (err?.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err?.message) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      
      // 네트워크 오류인 경우
      if (err?.code === 'ECONNABORTED' || err?.message?.includes('timeout')) {
        errorMessage = '요청 시간이 초과되었습니다. AI 서비스가 응답하지 않습니다.';
      } else if (err?.code === 'ERR_NETWORK' || err?.message?.includes('Network Error')) {
        errorMessage = '네트워크 오류가 발생했습니다. 서버 연결을 확인해주세요.';
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
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
