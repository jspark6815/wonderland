import React, { useState } from 'react';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (feedback: FeedbackData) => void;
  placeName: string;
  placeId: string;
  searchHistoryId?: string;
}

export interface FeedbackData {
  placeId: string;
  searchHistoryId?: string;
  visited: boolean;
  overallRating?: number;
  wouldRecommend?: boolean;
  hasParking?: boolean;
  parkingInfo?: string;
  hasWifi?: boolean;
  hasPowerOutlets?: boolean;
  petFriendly?: boolean;
  atmosphereTags?: string[];
  noiseLevel?: number;
  goodForSolo?: boolean;
  goodForDate?: boolean;
  goodForWork?: boolean;
  goodDessert?: boolean;
  goodCoffee?: boolean;
  comment?: string;
}

const ATMOSPHERE_OPTIONS = [
  '조용함', '활기참', '로맨틱', '아늑함', '모던', '힙함', '고급스러움', '캐주얼'
];

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  placeName,
  placeId,
  searchHistoryId,
}) => {
  const [step, setStep] = useState(1);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState<Partial<FeedbackData>>({});

  if (!isOpen) return null;

  const handleNotVisited = () => {
    onSubmit({ placeId, searchHistoryId, visited: false });
    onClose();
  };

  const handleSubmit = () => {
    onSubmit({
      placeId,
      searchHistoryId,
      visited: true,
      overallRating: rating || undefined,
      ...feedback,
    });
    onClose();
  };

  const toggleAtmosphere = (tag: string) => {
    const current = feedback.atmosphereTags || [];
    if (current.includes(tag)) {
      setFeedback({ ...feedback, atmosphereTags: current.filter(t => t !== tag) });
    } else {
      setFeedback({ ...feedback, atmosphereTags: [...current, tag] });
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        // 배경 클릭 시에만 닫힘 (내부 클릭은 무시)
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      onKeyDown={(e) => {
        // 모달 내부에서 키 이벤트 전파 방지
        e.stopPropagation();
      }}
    >
      <div 
        className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-blue-600 p-4 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">방문 후기</h2>
              <p className="text-sm text-white/80">{placeName}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-5">
          {/* Step 1: 방문 여부 */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-center text-gray-700 text-lg">
                <span className="font-semibold">{placeName}</span>에<br />
                방문하셨나요?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 py-4 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors"
                >
                  네, 방문했어요! ✅
                </button>
                <button
                  onClick={handleNotVisited}
                  className="flex-1 py-4 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                >
                  아니요 ❌
                </button>
              </div>
            </div>
          )}

          {/* Step 2: 별점 */}
          {step === 2 && (
            <div className="space-y-6">
              <p className="text-center text-gray-700">전체적으로 어떠셨나요?</p>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className="text-4xl transition-transform hover:scale-110"
                  >
                    {star <= rating ? '⭐' : '☆'}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl"
                >
                  이전
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 py-3 bg-blue-500 text-white rounded-xl"
                >
                  다음
                </button>
              </div>
            </div>
          )}

          {/* Step 3: 시설 정보 */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-gray-700 font-medium">시설 정보를 알려주세요 📝</p>
              
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'hasParking', label: '🚗 주차 가능' },
                  { key: 'hasWifi', label: '📶 WiFi' },
                  { key: 'hasPowerOutlets', label: '🔌 콘센트' },
                  { key: 'petFriendly', label: '🐕 애견동반' },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setFeedback({ 
                      ...feedback, 
                      [key]: !feedback[key as keyof FeedbackData] 
                    })}
                    className={`py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                      feedback[key as keyof FeedbackData]
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {feedback.hasParking && (
                <input
                  type="text"
                  placeholder="주차 정보 (예: 건물 지하 무료)"
                  value={feedback.parkingInfo || ''}
                  onChange={(e) => setFeedback({ ...feedback, parkingInfo: e.target.value })}
                  onKeyDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full px-4 py-3 bg-gray-100 rounded-xl text-sm"
                />
              )}

              <div className="flex gap-2 mt-4">
                <button onClick={() => setStep(2)} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl">
                  이전
                </button>
                <button onClick={() => setStep(4)} className="flex-1 py-3 bg-blue-500 text-white rounded-xl">
                  다음
                </button>
              </div>
            </div>
          )}

          {/* Step 4: 분위기 */}
          {step === 4 && (
            <div className="space-y-4">
              <p className="text-gray-700 font-medium">분위기는 어땠나요? ✨</p>
              
              <div className="flex flex-wrap gap-2">
                {ATMOSPHERE_OPTIONS.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleAtmosphere(tag)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      feedback.atmosphereTags?.includes(tag)
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>

              <p className="text-gray-700 font-medium mt-4">어떤 분들에게 추천하나요?</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'goodForSolo', label: '🧑 혼자' },
                  { key: 'goodForDate', label: '💑 데이트' },
                  { key: 'goodForWork', label: '💻 작업' },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setFeedback({ 
                      ...feedback, 
                      [key]: !feedback[key as keyof FeedbackData] 
                    })}
                    className={`py-3 rounded-xl text-sm font-medium transition-all ${
                      feedback[key as keyof FeedbackData]
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="flex gap-2 mt-4">
                <button onClick={() => setStep(3)} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl">
                  이전
                </button>
                <button onClick={() => setStep(5)} className="flex-1 py-3 bg-blue-500 text-white rounded-xl">
                  다음
                </button>
              </div>
            </div>
          )}

          {/* Step 5: 음식 & 코멘트 */}
          {step === 5 && (
            <div className="space-y-4">
              <p className="text-gray-700 font-medium">음식/음료는 어땠나요? ☕🍰</p>
              
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'goodCoffee', label: '☕ 커피 맛있음' },
                  { key: 'goodDessert', label: '🍰 디저트 맛있음' },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setFeedback({ 
                      ...feedback, 
                      [key]: !feedback[key as keyof FeedbackData] 
                    })}
                    className={`py-3 rounded-xl text-sm font-medium transition-all ${
                      feedback[key as keyof FeedbackData]
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <p className="text-gray-700 font-medium mt-4">추가로 알려주실 게 있나요?</p>
              <textarea
                placeholder="예: 2층 창가 자리가 좋아요, 웨이팅 10분 정도..."
                value={feedback.comment || ''}
                onChange={(e) => setFeedback({ ...feedback, comment: e.target.value })}
                onKeyDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                className="w-full px-4 py-3 bg-gray-100 rounded-xl text-sm resize-none h-24"
              />

              <div className="flex gap-2 mt-4">
                <button onClick={() => setStep(4)} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl">
                  이전
                </button>
                <button 
                  onClick={handleSubmit} 
                  className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium"
                >
                  완료! 🎉
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 진행 상태 */}
        <div className="px-5 pb-5">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <div
                key={s}
                className={`flex-1 h-1 rounded-full transition-colors ${
                  s <= step ? 'bg-blue-500' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

