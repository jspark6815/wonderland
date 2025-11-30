import { apiClient } from './client';

export const aiSearchAPI = async (query: string) => {
  const response = await apiClient.post('/ai/interpret', {
    query,
  });
  
  return {
    response: `"${query}"에 대한 검색 결과를 찾고 있습니다. 잠시만 기다려주세요.`,
    searchQuery: query,
    ...response,
  };
};

export const aiRecommendAPI = async (preferences: any) => {
  const response = await apiClient.post('/ai/recommend', preferences);
  return response;
};

export const aiSummarizeReviewsAPI = async (reviews: string[]) => {
  const response = await apiClient.post('/ai/summarize', { reviews });
  return response;
};
