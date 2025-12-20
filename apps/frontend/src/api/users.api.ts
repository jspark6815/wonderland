import { apiClient } from './client';

// ==================== 타입 정의 ====================

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  profileImage?: string;
  bio?: string;
  phone?: string;
  role: 'user' | 'admin';
  createdAt: string;
}

export interface UserSettings {
  id: string;
  userId: string;
  notificationEnabled: boolean;
  emailNotification: boolean;
  pushNotification: boolean;
  darkMode: boolean;
  language: string;
  saveSearchHistory: boolean;
  personalizedRecommendation: boolean;
  preferredCategories?: string[];
  defaultSearchRadius: number;
}

export interface Favorite {
  id: string;
  placeId: string;
  memo?: string;
  folder?: string;
  createdAt: string;
  place: {
    id: string;
    name: string;
    category?: string;
    address?: string;
    rating?: number;
    images?: string[];
    latitude?: number;
    longitude?: number;
  } | null;
}

export interface FavoriteFolder {
  folder: string;
  count: number;
}

// ==================== 프로필 API ====================

export const getProfileAPI = async (): Promise<UserProfile> => {
  return apiClient.get<UserProfile>('/users/profile');
};

export const updateProfileAPI = async (data: Partial<UserProfile>): Promise<UserProfile> => {
  return apiClient.put<UserProfile>('/users/profile', data);
};

// ==================== 설정 API ====================

export const getSettingsAPI = async (): Promise<UserSettings> => {
  return apiClient.get<UserSettings>('/users/settings');
};

export const updateSettingsAPI = async (data: Partial<UserSettings>): Promise<UserSettings> => {
  return apiClient.put<UserSettings>('/users/settings', data);
};

// ==================== 즐겨찾기 API ====================

export const getFavoritesAPI = async (folder?: string): Promise<Favorite[]> => {
  const params = folder ? `?folder=${encodeURIComponent(folder)}` : '';
  return apiClient.get<Favorite[]>(`/users/favorites${params}`);
};

export const getFavoriteFoldersAPI = async (): Promise<FavoriteFolder[]> => {
  return apiClient.get<FavoriteFolder[]>('/users/favorites/folders');
};

export const checkFavoriteAPI = async (placeId: string): Promise<{ isFavorite: boolean }> => {
  return apiClient.get<{ isFavorite: boolean }>(`/users/favorites/check/${placeId}`);
};

export const addFavoriteAPI = async (data: {
  placeId: string;
  memo?: string;
  folder?: string;
}): Promise<Favorite> => {
  return apiClient.post<Favorite>('/users/favorites', data);
};

export const updateFavoriteAPI = async (
  id: string,
  data: { memo?: string; folder?: string }
): Promise<Favorite> => {
  return apiClient.put<Favorite>(`/users/favorites/${id}`, data);
};

export const removeFavoriteAPI = async (id: string): Promise<{ success: boolean }> => {
  return apiClient.delete<{ success: boolean }>(`/users/favorites/${id}`);
};

export const removeFavoriteByPlaceIdAPI = async (placeId: string): Promise<{ success: boolean }> => {
  return apiClient.delete<{ success: boolean }>(`/users/favorites/place/${placeId}`);
};

// ==================== 토글 헬퍼 ====================

export const toggleFavoriteAPI = async (
  placeId: string,
  folder?: string
): Promise<{ isFavorite: boolean }> => {
  const { isFavorite } = await checkFavoriteAPI(placeId);
  
  if (isFavorite) {
    await removeFavoriteByPlaceIdAPI(placeId);
    return { isFavorite: false };
  } else {
    await addFavoriteAPI({ placeId, folder });
    return { isFavorite: true };
  }
};

