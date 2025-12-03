import React, { useRef, useEffect } from 'react';
import { useAISearch } from '@/hooks/useAISearch';

// Message 타입 export
export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: string[];
}

// 초기 메시지 생성 함수 export
export const createInitialMessages = (): ChatMessage[] => [
  {
    id: '1',
    type: 'assistant',
    content: '안녕하세요! 저는 장소 추천 AI "원더"예요 ✨\n\n어떤 장소를 찾고 계신가요? 자연스럽게 말씀해주세요!',
    timestamp: new Date(),
    suggestions: QUICK_SUGGESTIONS.map(s => s.text),
  },
];

interface ChatInterfaceProps {
  onClose?: () => void;
  onSearch: (query: string) => void;
  className?: string;
  // 상태를 부모에서 관리
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  input: string;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

// 빠른 추천 예시
const QUICK_SUGGESTIONS = [
  { icon: '☕', text: '조용한 카페', query: '조용히 작업하기 좋은 카페 추천해줘' },
  { icon: '🍽️', text: '데이트 맛집', query: '분위기 좋은 데이트 레스토랑 추천해줘' },
  { icon: '🍺', text: '회식 장소', query: '단체 회식하기 좋은 곳 추천해줘' },
  { icon: '🍜', text: '혼밥 맛집', query: '혼자 가기 좋은 맛집 추천해줘' },
];

const FOLLOW_UP_SUGGESTIONS = [
  '더 저렴한 곳은 없을까?',
  '주차가 되는 곳으로 알려줘',
  '다른 지역은 어때?',
  '더 조용한 곳은?',
];

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  onClose,
  onSearch,
  className = '',
  messages,
  setMessages,
  input,
  setInput,
  isLoading,
  setIsLoading,
}) => {
  const showQuickButtons = messages.length === 1;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { searchWithAI } = useAISearch();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const processMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: messageText.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const result = await searchWithAI(messageText);
      
      // AI 응답 생성
      let responseContent = result.response;
      
      // 검색 정보 추가
      if (result.searchQuery && result.searchQuery !== messageText) {
        responseContent += `\n\n🔍 "${result.searchQuery}"로 검색할게요!`;
      }
      
      // 추가 정보
      if (result.categories && result.categories.length > 0) {
        responseContent += `\n📂 카테고리: ${result.categories.join(', ')}`;
      }
      if (result.location) {
        responseContent += `\n📍 지역: ${result.location}`;
      }
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: responseContent,
        timestamp: new Date(),
        suggestions: FOLLOW_UP_SUGGESTIONS,
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
      // 검색 실행
      if (result.searchQuery) {
        setTimeout(() => {
          onSearch(result.searchQuery);
        }, 500);
      }
      
    } catch (error: any) {
      const errMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: `죄송해요, 문제가 발생했어요 😥\n\n${error?.message || '다시 시도해주세요.'}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = () => processMessage(input);

  const handleQuickSuggestion = (suggestion: typeof QUICK_SUGGESTIONS[0]) => {
    processMessage(suggestion.query);
  };

  const handleFollowUp = (text: string) => {
    processMessage(text);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={`flex flex-col bg-white rounded-2xl ${className}`}>
      {/* 헤더 */}
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-500 to-blue-600 rounded-t-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-full flex items-center justify-center">
            <span className="text-2xl">✨</span>
          </div>
          <div>
            <h3 className="font-bold text-white">AI 원더</h3>
            <p className="text-xs text-white/80">장소 추천 어시스턴트</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            aria-label="닫기"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((message) => (
          <div key={message.id}>
            <div className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              {message.type === 'assistant' && (
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-2 flex-shrink-0">
                  <span className="text-sm">✨</span>
                </div>
              )}
              <div
                className={`
                  max-w-[85%] p-3 rounded-2xl shadow-sm
                  ${message.type === 'user'
                    ? 'bg-blue-500 text-white rounded-br-md'
                    : 'bg-white text-gray-800 rounded-bl-md'
                  }
                `}
              >
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                <p className={`text-xs mt-1 ${message.type === 'user' ? 'text-white/70' : 'text-gray-400'}`}>
                  {message.timestamp.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
            
            {/* 팔로업 제안 버튼 */}
            {message.type === 'assistant' && message.suggestions && messages[messages.length - 1].id === message.id && !isLoading && (
              <div className="flex flex-wrap gap-2 mt-3 ml-10">
                {message.suggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleFollowUp(suggestion)}
                    className="px-3 py-1.5 text-xs bg-white border border-gray-200 text-gray-600 rounded-full hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition-all"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-2">
              <span className="text-sm">✨</span>
            </div>
            <div className="bg-white p-4 rounded-2xl rounded-bl-md shadow-sm">
              <div className="flex gap-1.5 items-center">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                <span className="ml-2 text-xs text-gray-400">생각하는 중...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* 빠른 추천 버튼 */}
      {showQuickButtons && messages.length === 1 && (
        <div className="px-4 py-3 border-t bg-white">
          <p className="text-xs text-gray-500 mb-2">빠른 추천</p>
          <div className="grid grid-cols-2 gap-2">
            {QUICK_SUGGESTIONS.map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => handleQuickSuggestion(suggestion)}
                className="flex items-center gap-2 p-3 bg-gray-50 hover:bg-blue-50 rounded-xl text-left transition-colors group"
              >
                <span className="text-xl">{suggestion.icon}</span>
                <span className="text-sm text-gray-700 group-hover:text-blue-600">{suggestion.text}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 입력 영역 */}
      <div className="border-t p-4 bg-white rounded-b-2xl">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="예: 강남역 근처 조용한 카페 추천해줘"
            disabled={isLoading}
            className="
              flex-1 px-4 py-3 bg-gray-100 rounded-xl
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white
              disabled:bg-gray-100 disabled:cursor-not-allowed
              text-sm transition-all
            "
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="
              p-3 bg-blue-500 text-white rounded-xl
              hover:bg-blue-600 transition-all
              disabled:bg-gray-300 disabled:cursor-not-allowed
              active:scale-95
            "
            aria-label="전송"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};
