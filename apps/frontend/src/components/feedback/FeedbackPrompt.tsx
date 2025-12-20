import React, { useState, useEffect } from 'react';
import { FeedbackModal, FeedbackData } from './FeedbackModal';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@/api/client';

interface PendingFeedback {
  placeId: string;
  placeName: string;
  searchHistoryId: string;
  searchedAt: string;
}

/**
 * 피드백 프롬프트 컴포넌트
 * 5분 후 자동으로 피드백 요청 표시
 */
export const FeedbackPrompt: React.FC = () => {
  const [pendingFeedback, setPendingFeedback] = useState<PendingFeedback | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const { isAuthenticated } = useAuthStore();

  // 5분마다 피드백 요청 확인
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkPendingFeedbacks = async () => {
      try {
        const response = await apiClient.get<PendingFeedback[]>('/feedback/pending');
        // apiClient interceptor가 data를 직접 반환
        const data = response as unknown as PendingFeedback[];
        const pending = data.find((p: PendingFeedback) => !dismissed.has(p.searchHistoryId));
        if (pending) {
          setPendingFeedback(pending);
        }
      } catch {
        // 에러 무시
      }
    };

    // 초기 체크 (10초 후)
    const initialTimeout = setTimeout(checkPendingFeedbacks, 10000);
    
    // 이후 1분마다 체크
    const interval = setInterval(checkPendingFeedbacks, 1 * 60 * 1000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [isAuthenticated, dismissed]);

  const handleSubmitFeedback = async (feedback: FeedbackData) => {
    try {
      await apiClient.post('/feedback', feedback);
      setDismissed(prev => new Set([...prev, pendingFeedback?.searchHistoryId || '']));
      setPendingFeedback(null);
    } catch {
      // 에러 처리
    }
  };

  const handleDismiss = () => {
    if (pendingFeedback) {
      setDismissed(prev => new Set([...prev, pendingFeedback.searchHistoryId]));
    }
    setPendingFeedback(null);
  };

  if (!pendingFeedback || !isAuthenticated) return null;

  return (
    <>
      {/* 플로팅 알림 */}
      {!showModal && (
        <div className="fixed bottom-24 right-4 z-40 animate-bounce-slow">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4 max-w-xs">
            <div className="flex items-start gap-3">
              <span className="text-2xl">📍</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {pendingFeedback.placeName}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  방문하셨나요? 후기를 남겨주세요!
                </p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => setShowModal(true)}
                    className="px-3 py-1.5 bg-blue-500 text-white text-xs font-medium rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    후기 작성
                  </button>
                  <button
                    onClick={handleDismiss}
                    className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    나중에
                  </button>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 피드백 모달 */}
      <FeedbackModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          handleDismiss();
        }}
        onSubmit={handleSubmitFeedback}
        placeName={pendingFeedback.placeName}
        placeId={pendingFeedback.placeId}
        searchHistoryId={pendingFeedback.searchHistoryId}
      />
    </>
  );
};

