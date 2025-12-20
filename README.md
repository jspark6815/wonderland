# 🎪 Wonderland

> AI가 안내하는 놀라운 장소 발견 플랫폼

Naver Map과 AI를 활용하여 사용자에게 최적의 장소를 추천하는 웹 애플리케이션입니다.

---

## 📋 목차

- [프로젝트 소개](#-프로젝트-소개)
- [시작하기](#-시작하기)
- [환경변수 설정](#-환경변수-설정)
- [API 키 발급](#-api-키-발급)
- [프로젝트 구조](#-프로젝트-구조)
- [기술 스택](#-기술-스택)
- [주요 기능](#-주요-기능)
- [AI 활용](#-ai-활용)
- [아키텍처](#-아키텍처)
- [개발 가이드](#-개발-가이드)
- [트러블슈팅](#-트러블슈팅)

---

## 📌 프로젝트 소개

**Wonderland**는 자연어 기반 AI 검색과 Naver Map을 결합한 장소 발견 플랫폼입니다.

### 핵심 가치
- **자연어 검색**: "홍대 근처 데이트하기 좋은 카페" 같은 일상적인 문장으로 검색
- **AI 기반 추천**: 사용자 의도를 파악하여 맞춤형 장소 추천
- **Multi-turn 대화**: 이전 검색 컨텍스트를 기억하여 연속적인 대화 지원
- **실시간 피드백**: 사용자 피드백을 학습하여 추천 정확도 향상

---

## 🚀 시작하기

### 필수 요구사항

- **Node.js** 18.0.0 이상
- **pnpm** 8.0.0 이상
- **Docker** & **Docker Compose**
- **Git**

### 1단계: 저장소 클론

```bash
git clone <repository-url>
cd wonderland
```

### 2단계: 의존성 설치

```bash
pnpm install
```

### 3단계: Docker 서비스 시작

```bash
# PostgreSQL, Redis, Ollama 컨테이너 실행
pnpm run docker:dev

# 또는
docker-compose up -d
```

### 4단계: Ollama 모델 다운로드

```bash
# Llama 3.2:3b 모델 다운로드 (약 2GB)
docker exec -it wonderland-ollama ollama pull llama3.2:3b

# 모델 확인
docker exec -it wonderland-ollama ollama list
```

### 5단계: 환경변수 설정

```bash
# Backend 환경변수 복사
cp apps/backend/.env.example apps/backend/.env

# Frontend 환경변수 복사
cp apps/frontend/.env.example apps/frontend/.env

# 필요한 값 수정 (API 키 등)
```

### 6단계: 개발 서버 실행

```bash
# 전체 서비스 실행 (Frontend + Backend)
pnpm run dev

# 또는 개별 실행
pnpm run dev:frontend  # Frontend만
pnpm run dev:backend   # Backend만
```

### 7단계: 접속 확인

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **Swagger UI**: http://localhost:3000/api/docs

---

## 🔐 환경변수 설정

각 앱 디렉토리의 `.env.example` 파일을 참고하여 `.env` 파일을 생성하세요.

### Backend 주요 환경변수

| 변수명 | 설명 | 기본값 |
|--------|------|--------|
| `DATABASE_HOST` | PostgreSQL 호스트 | `localhost` |
| `DATABASE_PORT` | PostgreSQL 포트 | `5432` |
| `AI_PROVIDER` | AI 제공자 (ollama/gemini) | `ollama` |
| `LLM_HOST` | Ollama 서버 주소 | `http://localhost:11434` |
| `GEMINI_API_KEY` | Google Gemini API 키 | - |
| `NAVER_CLIENT_ID` | 네이버 검색 API Client ID | - |
| `NAVER_CLIENT_SECRET` | 네이버 검색 API Client Secret | - |
| `AI_CACHE_TTL` | AI 쿼리 캐시 TTL (초) | `300` |

### Frontend 주요 환경변수

| 변수명 | 설명 | 기본값 |
|--------|------|--------|
| `VITE_API_URL` | API 서버 URL | `http://localhost:3000/api/v1` |
| `VITE_NAVER_MAP_KEY_ID` | 네이버 지도 Key ID | - |
| `VITE_AI_INTERPRET_STREAM` | AI 스트리밍 활성화 | `false` |

> 📄 상세한 환경변수 목록은 `apps/backend/.env.example`, `apps/frontend/.env.example` 참고

---

## 🔑 API 키 발급

### 1. 네이버 지도 API (Naver Cloud Platform)

**용도**: 지도 표시

1. [Naver Cloud Platform](https://console.ncloud.com) 접속
2. **Services** → **Maps** → **Application** 선택
3. 애플리케이션 생성 후 **Key ID** 복사
4. `apps/frontend/.env`의 `VITE_NAVER_MAP_KEY_ID`에 설정

### 2. 네이버 검색 API (Naver 개발자 센터)

**용도**: 장소 검색

1. [Naver 개발자 센터](https://developers.naver.com) 접속
2. **Application** → **애플리케이션 등록**
3. **검색** API 선택 후 활성화
4. **Client ID**와 **Client Secret** 복사
5. `apps/backend/.env`에 설정

### 3. Google Gemini API (선택)

**용도**: 클라우드 LLM (Ollama 대안)

1. [Google AI Studio](https://aistudio.google.com) 접속
2. API 키 생성
3. `apps/backend/.env`의 `GEMINI_API_KEY`에 설정
4. `AI_PROVIDER=gemini`로 변경

---

## 📁 프로젝트 구조

```
wonderland/
├── apps/
│   ├── frontend/              # React + Vite 프론트엔드
│   │   ├── src/
│   │   │   ├── api/           # API 클라이언트 (axios 인스턴스)
│   │   │   ├── components/    # React 컴포넌트
│   │   │   │   ├── ai/        # AI 추천 관련
│   │   │   │   ├── auth/      # 인증 관련
│   │   │   │   ├── feedback/  # 피드백 컴포넌트
│   │   │   │   ├── map/       # 지도 컴포넌트
│   │   │   │   ├── places/    # 장소 카드/리스트
│   │   │   │   └── search/    # 검색 UI
│   │   │   ├── hooks/         # Custom Hooks
│   │   │   ├── pages/         # 페이지 컴포넌트
│   │   │   ├── store/         # Zustand 상태 관리
│   │   │   ├── types/         # TypeScript 타입
│   │   │   └── utils/         # 유틸리티 함수
│   │   └── .env.example       # 환경변수 샘플
│   │
│   └── backend/               # NestJS 백엔드
│       ├── src/
│       │   ├── common/        # 공통 모듈
│       │   │   ├── decorators/# @Public, @CurrentUser 등
│       │   │   ├── filters/   # HttpExceptionFilter
│       │   │   ├── guards/    # AuthGuard, RolesGuard
│       │   │   ├── interceptors/ # LoggingInterceptor
│       │   │   ├── interfaces/# 공통 인터페이스
│       │   │   └── pipes/     # SanitizeHtmlPipe, TrimPipe
│       │   ├── config/        # 환경 설정 모듈
│       │   ├── entities/      # TypeORM 엔티티
│       │   ├── modules/       # 기능 모듈
│       │   │   ├── ai/        # AI/LLM 서비스
│       │   │   ├── audit/     # 감사 로그
│       │   │   ├── auth/      # 인증/인가
│       │   │   ├── feedback/  # 사용자 피드백
│       │   │   ├── health/    # 헬스 체크
│       │   │   ├── places/    # 장소 관리
│       │   │   └── users/     # 사용자 관리
│       │   └── seeds/         # 시드 데이터
│       └── .env.example       # 환경변수 샘플
│
├── packages/
│   ├── shared/                # 공통 타입/상수/유틸
│   └── eslint-config/         # 공유 ESLint 설정
│
├── docker/                    # Docker 설정 파일
├── docs/                      # 프로젝트 문서
├── .cursor/                   # Cursor AI 지시사항
├── docker-compose.yml         # Docker Compose 설정
└── turbo.json                 # Turborepo 설정
```

---

## 🛠 기술 스택

### Frontend
| 기술 | 용도 |
|------|------|
| **React 18** + **TypeScript** | UI 프레임워크 |
| **Vite** | 빌드 도구 |
| **TanStack Query** | 서버 상태 관리 |
| **Zustand** | 클라이언트 상태 관리 |
| **Tailwind CSS** | 스타일링 |
| **Naver Maps API** | 지도 서비스 |

### Backend
| 기술 | 용도 |
|------|------|
| **NestJS** + **TypeScript** | API 서버 프레임워크 |
| **TypeORM** | ORM |
| **PostgreSQL** + **PostGIS** | 공간 데이터베이스 |
| **Redis** (선택) | 캐싱 |
| **Ollama / Gemini** | LLM |
| **Swagger** | API 문서화 |
| **@nestjs/throttler** | Rate Limiting |

### 인프라
| 기술 | 용도 |
|------|------|
| **Docker** & **Docker Compose** | 컨테이너화 |
| **pnpm** | 패키지 매니저 |
| **Turborepo** | Monorepo 빌드 시스템 |

---

## ✨ 주요 기능

### 🗺️ 지도 기반 검색
- Naver Map API를 활용한 인터랙티브 지도
- 지도 이동 시 자동으로 주변 장소 검색
- 마커 클러스터링으로 성능 최적화

### 🔍 통합 검색
- 키워드 검색
- 카테고리 필터 (음식점, 카페, 편의점 등)
- 위치 기반 검색 (현재 지도 중심 기준)

### 🤖 AI 추천
- 자연어 검색 쿼리 해석
- 상황별 장소 추천 (데이트, 회식, 혼밥 등)
- Multi-turn 대화 지원
- 클릭 가능한 후속 키워드 제안

### 💬 사용자 피드백
- 방문 후 N분 경과 시 피드백 팝업
- 좋아요/싫어요 기반 학습
- 추천 정확도 지속 개선

### 📊 로그 및 모니터링
- 모든 API 요청/응답 자동 로깅
- 성능 모니터링 (느린 요청 추적)
- 감사 로그 (데이터 변경 추적)

### 🛡️ 보안 기능
- Rate Limiting (API 보호)
- JWT 인증 + Refresh Token
- XSS 방지 (SanitizeHtmlPipe)
- 에러 응답 포맷 통일

---

## 🤖 AI 활용

### 1. LLM Provider 선택

| Provider | 특징 | 설정 |
|----------|------|------|
| **Ollama** | 로컬 실행, 무료, 오프라인 | `AI_PROVIDER=ollama` |
| **Gemini** | 클라우드, 빠름, API 키 필요 | `AI_PROVIDER=gemini` |

### 2. AI 쿼리 캐싱 (토큰 절약)

동일한 쿼리에 대해 LLM 호출을 캐싱하여 토큰 비용을 절약합니다.

```
사용자 쿼리 → 정규화 → SHA256 해시 → 캐시 조회
                                         ↓
                    ┌────────────────────┴────────────────────┐
                    ↓                                         ↓
               Cache HIT                                 Cache MISS
                    ↓                                         ↓
              즉시 반환                                   LLM 호출
            (토큰 소비 0)                              (평균 500토큰)
```

**쿼리 정규화 예시**:
```
"홍대 카페 찾아줘" → "홍대 카페"
"홍대 카페 추천해줘" → "홍대 카페"
"홍대 카페 알려줘" → "홍대 카페"
→ 모두 같은 캐시 키로 매핑
```

**캐시 통계 API**: `GET /api/v1/ai/cache/stats`

### 3. 프롬프트 엔지니어링

- Few-shot 학습으로 출력 형식 안정화
- 지역 약어 정규화 (`홍대` → `홍대입구역`)
- 컨텍스트 기반 연속 대화 지원

### 4. Fallback 전략

```
1차: AI 쿼리 해석 (LLM)
  ↓ 실패 시
2차: 규칙 기반 해석 (정규식)
  ↓ 최소 결과
기본값: "서울" 지역으로 검색
```

---

## 🏗 아키텍처

### 전체 구조

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend (React)                     │
│  ┌────────────┐  ┌────────────┐  ┌─────────────────────┐   │
│  │   Maps     │  │   Search   │  │   AI Recommend      │   │
│  │  Module    │  │   Module   │  │     Module          │   │
│  └────────────┘  └────────────┘  └─────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                         HTTP/REST
                              │
┌─────────────────────────────────────────────────────────────┐
│                         Backend (NestJS)                     │
│  ┌────────────┐  ┌────────────┐  ┌─────────────────────┐   │
│  │  Places    │  │    AI      │  │      Auth           │   │
│  │  Module    │  │  Module    │  │     Module          │   │
│  └─────┬──────┘  └─────┬──────┘  └─────────────────────┘   │
│        │               │                                    │
│  ┌─────┴──────┐  ┌─────┴──────┐  ┌─────────────────────┐   │
│  │   Cache    │  │    LLM     │  │     Feedback        │   │
│  │  Service   │  │  Service   │  │     Module          │   │
│  └────────────┘  └────────────┘  └─────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
          │                    │
┌─────────┴────────┐  ┌────────┴────────┐
│   PostgreSQL     │  │ Ollama / Gemini │
│   (PostGIS)      │  │     (LLM)       │
└──────────────────┘  └─────────────────┘
```

### 모듈 구조 (Backend)

| 모듈 | 역할 |
|------|------|
| `common/` | 데코레이터, 필터, 가드, 파이프 등 공통 유틸 |
| `config/` | 환경 설정 (DB, JWT, AI, Rate Limiting) |
| `modules/ai/` | LLM 연동, 쿼리 해석, 캐싱 |
| `modules/places/` | 장소 CRUD, 검색, 캐싱 |
| `modules/auth/` | JWT 인증, Refresh Token |
| `modules/feedback/` | 사용자 피드백 수집 |
| `modules/audit/` | 감사 로그 |

### 데이터 흐름

```
[사용자 입력]
     │
     ▼
[Frontend] ─── POST /api/v1/ai/interpret ───▶ [AI Module]
     │                                              │
     │                                         [캐시 조회]
     │                                              │
     │                           ┌─────────────────┴─────────────────┐
     │                           ↓                                   ↓
     │                     Cache HIT                            Cache MISS
     │                           ↓                                   ↓
     │                      즉시 반환                           [LLM 호출]
     │                           │                                   │
     │                           └─────────────────┬─────────────────┘
     │                                             │
     ◀─────────────────────────────────────────────
     │
     ▼
[Frontend] ─── GET /api/v1/places/search ───▶ [Places Module]
     │                                              │
     │                           ┌─────────────────┴─────────────────┐
     │                           ↓                                   ↓
     │                    [내부 DB 검색]                    [외부 API 검색]
     │                           │                                   │
     │                           └─────────────────┬─────────────────┘
     │                                             │
     ◀─────────────────────────────────────────────
     │
     ▼
[지도에 마커 표시]
```

---

## 💻 개발 가이드

### 데이터베이스 시드 실행

```bash
cd apps/backend
pnpm run seed
```

### 코드 스타일

```bash
# Lint 검사
pnpm run lint

# 자동 수정
pnpm run lint --fix
```

### 빌드

```bash
# 전체 빌드
pnpm run build

# 개별 빌드
cd apps/frontend && pnpm run build
cd apps/backend && pnpm run build
```

### Docker 관리

```bash
# 서비스 시작
pnpm run docker:dev

# 로그 확인
pnpm run docker:logs

# 서비스 재시작
pnpm run docker:restart

# 서비스 중지
pnpm run docker:down

# 볼륨 포함 완전 삭제
pnpm run docker:clean
```

### AI 캐시 관리

```bash
# 캐시 통계 확인
curl http://localhost:3000/api/v1/ai/cache/stats

# 캐시 초기화
curl -X DELETE http://localhost:3000/api/v1/ai/cache
```

---

## 🔧 트러블슈팅

### 데이터베이스 연결 오류

```bash
# PostgreSQL 컨테이너 상태 확인
docker ps | grep postgres

# 컨테이너 재시작
docker-compose restart postgres

# 로그 확인
docker-compose logs postgres
```

### Ollama 모델이 인식되지 않음

```bash
# 모델 목록 확인
docker exec -it wonderland-ollama ollama list

# 모델 재다운로드
docker exec -it wonderland-ollama ollama pull llama3.2:3b

# Ollama 재시작
docker-compose restart ollama
```

### AI 응답이 느림

1. **Gemini 사용 권장**: `AI_PROVIDER=gemini`로 변경
2. **캐시 활용**: 동일 쿼리는 캐시에서 즉시 반환
3. **타임아웃 조정**: `LLM_TIMEOUT` 환경변수 조정

### 테이블이 생성되지 않음

```bash
# NODE_ENV 확인
echo $NODE_ENV

# 개발 모드로 설정
export NODE_ENV=development

# 백엔드 재시작
pnpm run dev:backend
```

### 포트 충돌

```bash
# 포트 사용 확인
lsof -i :3000  # Backend
lsof -i :5173  # Frontend
lsof -i :5432  # PostgreSQL

# 다른 포트 사용 시 .env 파일 수정
```

---

## 📚 추가 문서

- [프로젝트 구조](./.cursor/structure.mdc)
- [코딩 컨벤션](./.cursor/conventions.mdc)
- [Git 워크플로우](./.cursor/git-workflow.mdc)
- [보안 규칙](./.cursor/security.mdc)
- [아키텍처 설명](./docs/architecture.md)
- [CodeRabbit 가이드](./docs/CODERABBIT_GUIDE.md)

---

## 📄 License

MIT

---

**Made with ❤️ by Wonderland Team**
