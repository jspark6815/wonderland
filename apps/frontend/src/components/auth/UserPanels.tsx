import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import {
  getProfileAPI,
  updateProfileAPI,
  getSettingsAPI,
  updateSettingsAPI,
  getFavoritesAPI,
  removeFavoriteAPI,
  UserProfile,
  UserSettings,
  Favorite,
} from '@/api/users.api';

type PanelProps = {
  isOpen: boolean;
  onClose: () => void;
};

const ModalShell: React.FC<PanelProps & { title: string; children: React.ReactNode }> = ({
  isOpen,
  onClose,
  title,
  children,
}) => {
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="닫기"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-5 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
};

// ==================== 프로필 패널 ====================
export const ProfilePanel: React.FC<PanelProps> = ({ isOpen, onClose }) => {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', bio: '', phone: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      getProfileAPI()
        .then((data) => {
          setProfile(data);
          setEditForm({ name: data.name || '', bio: data.bio || '', phone: data.phone || '' });
        })
        .catch(() => {})
        .finally(() => setIsLoading(false));
    }
  }, [isOpen]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updated = await updateProfileAPI(editForm);
      setProfile(updated);
      setIsEditing(false);
    } catch {
      alert('프로필 저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ModalShell isOpen={isOpen} onClose={onClose} title="내 프로필">
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* 아바타 및 기본 정보 */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-lg">
              {profile?.name?.[0]?.toUpperCase() || profile?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1">
              {isEditing ? (
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="이름"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <>
                  <div className="text-lg font-bold text-gray-900">{profile?.name || '이름 없음'}</div>
                  <div className="text-sm text-gray-500">{profile?.email}</div>
                </>
              )}
            </div>
          </div>

          {/* 자기소개 */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">자기소개</label>
            {isEditing ? (
              <textarea
                value={editForm.bio}
                onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                placeholder="자기소개를 입력하세요"
                maxLength={200}
                className="w-full px-3 py-2 border rounded-lg text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">
                {profile?.bio || '자기소개가 없습니다.'}
              </p>
            )}
          </div>

          {/* 연락처 */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">전화번호</label>
            {isEditing ? (
              <input
                type="tel"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                placeholder="010-1234-5678"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-sm text-gray-700">{profile?.phone || '-'}</p>
            )}
          </div>

          {/* 계정 정보 */}
          <div className="bg-gray-50 rounded-lg p-3 text-sm">
            <p className="text-gray-500">
              역할: <span className="font-medium text-gray-700">{profile?.role === 'admin' ? '관리자' : '일반 사용자'}</span>
            </p>
            <p className="text-gray-500">
              가입일: <span className="font-medium text-gray-700">{profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('ko-KR') : '-'}</span>
            </p>
          </div>

          {/* 버튼 */}
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex-1 py-2.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 py-2.5 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 disabled:opacity-50"
                >
                  {isSaving ? '저장 중...' : '저장'}
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="w-full py-2.5 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600"
              >
                프로필 수정
              </button>
            )}
          </div>
        </div>
      )}
    </ModalShell>
  );
};

// ==================== 즐겨찾기 패널 ====================
export const FavoritesPanel: React.FC<PanelProps & { onPlaceClick?: (place: any) => void }> = ({
  isOpen,
  onClose,
  onPlaceClick,
}) => {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      getFavoritesAPI()
        .then(setFavorites)
        .catch(() => {})
        .finally(() => setIsLoading(false));
    }
  }, [isOpen]);

  const handleRemove = async (id: string) => {
    if (!confirm('즐겨찾기에서 삭제하시겠습니까?')) return;
    try {
      await removeFavoriteAPI(id);
      setFavorites((prev) => prev.filter((f) => f.id !== id));
    } catch {
      alert('삭제에 실패했습니다.');
    }
  };

  return (
    <ModalShell isOpen={isOpen} onClose={onClose} title="즐겨찾기">
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      ) : favorites.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-8 space-y-3">
          <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center text-2xl">
            ★
          </div>
          <div className="text-gray-900 font-semibold">즐겨찾기한 장소가 없어요</div>
          <p className="text-sm text-gray-500">
            장소 상세 화면에서 하트를 누르면<br />즐겨찾기에 저장됩니다.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {favorites.map((fav) => (
            <div
              key={fav.id}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
            >
              {/* 이미지 */}
              <div
                className="w-14 h-14 rounded-lg bg-gray-200 flex-shrink-0 overflow-hidden cursor-pointer"
                onClick={() => fav.place && onPlaceClick && onPlaceClick(fav.place)}
              >
                {fav.place?.images?.[0] ? (
                  <img src={fav.place.images[0]} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-xl">🏢</div>
                )}
              </div>

              {/* 정보 */}
              <div
                className="flex-1 min-w-0 cursor-pointer"
                onClick={() => fav.place && onPlaceClick && onPlaceClick(fav.place)}
              >
                <div className="font-medium text-gray-900 truncate">{fav.place?.name || '알 수 없는 장소'}</div>
                <div className="text-xs text-gray-500 truncate">
                  {fav.place?.category?.split('>').pop()} · {fav.place?.address?.split(' ').slice(0, 2).join(' ')}
                </div>
                {fav.memo && <div className="text-xs text-blue-500 mt-0.5 truncate">📝 {fav.memo}</div>}
              </div>

              {/* 삭제 버튼 */}
              <button
                onClick={() => handleRemove(fav.id)}
                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                aria-label="삭제"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </ModalShell>
  );
};

// ==================== 설정 패널 ====================
export const SettingsPanel: React.FC<PanelProps> = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      getSettingsAPI()
        .then(setSettings)
        .catch(() => {})
        .finally(() => setIsLoading(false));
    }
  }, [isOpen]);

  const handleToggle = async (key: keyof UserSettings) => {
    if (!settings) return;
    setIsSaving(true);
    try {
      const newValue = !settings[key];
      const updated = await updateSettingsAPI({ [key]: newValue });
      setSettings(updated);
    } catch {
      alert('설정 저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const ToggleRow = ({
    label,
    description,
    value,
    onChange,
  }: {
    label: string;
    description: string;
    value: boolean;
    onChange: () => void;
  }) => (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div>
        <div className="text-sm font-medium text-gray-900">{label}</div>
        <div className="text-xs text-gray-500">{description}</div>
      </div>
      <button
        onClick={onChange}
        disabled={isSaving}
        className={`w-12 h-6 rounded-full transition-colors ${value ? 'bg-blue-500' : 'bg-gray-300'} ${isSaving ? 'opacity-50' : ''}`}
      >
        <div
          className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${value ? 'translate-x-6' : 'translate-x-1'}`}
        />
      </button>
    </div>
  );

  return (
    <ModalShell isOpen={isOpen} onClose={onClose} title="설정">
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      ) : settings ? (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">알림</p>
          <ToggleRow
            label="알림 받기"
            description="새 추천/업데이트 소식을 받아요"
            value={settings.notificationEnabled}
            onChange={() => handleToggle('notificationEnabled')}
          />
          <ToggleRow
            label="이메일 알림"
            description="이메일로 알림을 받아요"
            value={settings.emailNotification}
            onChange={() => handleToggle('emailNotification')}
          />
          <ToggleRow
            label="푸시 알림"
            description="브라우저 푸시 알림"
            value={settings.pushNotification}
            onChange={() => handleToggle('pushNotification')}
          />

          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-4 mb-2">개인화</p>
          <ToggleRow
            label="검색 기록 저장"
            description="검색 기록을 저장하여 추천에 활용"
            value={settings.saveSearchHistory}
            onChange={() => handleToggle('saveSearchHistory')}
          />
          <ToggleRow
            label="개인화 추천"
            description="내 취향에 맞는 장소 추천"
            value={settings.personalizedRecommendation}
            onChange={() => handleToggle('personalizedRecommendation')}
          />

          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-4 mb-2">화면</p>
          <ToggleRow
            label="다크 모드"
            description="어두운 테마 사용 (준비 중)"
            value={settings.darkMode}
            onChange={() => handleToggle('darkMode')}
          />

          <div className="mt-4 pt-3 border-t">
            <p className="text-xs text-gray-500">
              기본 검색 반경: <span className="font-medium">{settings.defaultSearchRadius}m</span>
            </p>
          </div>
        </div>
      ) : (
        <p className="text-center text-gray-500 py-8">설정을 불러올 수 없습니다.</p>
      )}
    </ModalShell>
  );
};
