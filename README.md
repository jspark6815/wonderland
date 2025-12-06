# 🎪 Wonderland

> AI가 안내하는 놀라운 장소 발견 플랫폼

Naver Map과 AI를 활용하여 사용자에게 최적의 장소를 추천하는 웹 애플리케이션입니다.

---

## 📋 목차

- [시작하기](#-시작하기)
- [환경변수 설정](#-환경변수-설정)
- [API 키 발급](#-api-키-발급)
- [프로젝트 구조](#-프로젝트-구조)
- [주요 기능](#-주요-기능)
- [기술 스택](#-기술-스택)
- [개발 가이드](#-개발-가이드)
- [트러블슈팅](#-트러블슈팅)

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

프로젝트 루트와 각 앱 디렉토리에 `.env` 파일을 생성하고 설정합니다.

```bash
# 프로젝트 루트
touch .env

# 백엔드
touch apps/backend/.env

# 프론트엔드
touch apps/frontend/.env
```

환경변수 내용은 [환경변수 설정](#-환경변수-설정) 섹션을 참고하세요.

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

### 프로젝트 루트 `.env` (선택사항)

```env
NODE_ENV=development
```

### `apps/backend/.env`

```env
# 데이터베이스
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=wonderland

# Ollama (AI)
LLM_HOST=http://localhost:11434
LLM_MODEL=llama3.2:3b
LLM_TEMPERATURE=0.7
LLM_MAX_TOKENS=2048

# 네이버 검색 API (Naver 개발자 센터)
NAVER_CLIENT_ID=your_client_id
NAVER_CLIENT_SECRET=your_client_secret

# Rate Limiting (선택사항)
THROTTLE_SHORT_LIMIT=10
THROTTLE_MEDIUM_LIMIT=50
THROTTLE_LONG_LIMIT=200

# 서버
PORT=3000
FRONTEND_URL=http://localhost:5173
```

### `apps/frontend/.env`

```env
# 네이버 지도 API (Naver Cloud Platform)
VITE_NAVER_MAP_KEY_ID=your_key_id

# API 서버
VITE_API_BASE_URL=http://localhost:3000/api/v1
```

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

---

## 📁 프로젝트 구조

```
wonderland/
├── apps/
│   ├── frontend/          # React + Vite 프론트엔드
│   │   ├── src/
│   │   │   ├── api/       # API 클라이언트
│   │   │   ├── components/# React 컴포넌트
│   │   │   ├── hooks/     # Custom Hooks
│   │   │   ├── pages/     # 페이지 컴포넌트
│   │   │   └── store/     # Zustand 상태 관리
│   │   └── package.json
│   │
│   └── backend/           # NestJS 백엔드
│       ├── src/
│       │   ├── common/    # 공통 모듈 (Filters, Guards, Interceptors)
│       │   ├── entities/  # TypeORM 엔티티
│       │   ├── modules/   # 기능 모듈
│       │   │   ├── ai/    # AI 서비스
│       │   │   ├── places/# 장소 관리
│       │   │   └── logs/  # 로그 관리
│       │   └── seeds/     # 시드 데이터
│       └── package.json
│
├── packages/
│   └── shared/            # 공통 타입/상수/유틸
│
├── docker/                # Docker 설정 파일
├── docker-compose.yml     # Docker Compose 설정
└── package.json          # Monorepo 루트 설정
```

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

### 📊 로그 관리
- 모든 API 요청/응답 자동 로깅
- 로그 조회 및 통계 API
- 성능 모니터링 (느린 요청 추적)

### 🛡️ 보안 기능
- Rate Limiting (API 보호)
- 에러 응답 포맷 통일
- 요청/응답 로깅

---

## 🛠 기술 스택

### Frontend
- **React 18** + **TypeScript**
- **Vite** - 빌드 도구
- **TanStack Query** - 서버 상태 관리
- **Zustand** - 클라이언트 상태 관리
- **Tailwind CSS** - 스타일링
- **Naver Maps API** - 지도 서비스

### Backend
- **NestJS** + **TypeScript**
- **TypeORM** - ORM
- **PostgreSQL** + **PostGIS** - 공간 데이터베이스
- **Redis** - 캐싱
- **Ollama** (Llama 3.2:3b) - 로컬 LLM
- **Swagger** - API 문서화
- **@nestjs/throttler** - Rate Limiting

### 인프라
- **Docker** & **Docker Compose**
- **pnpm** - 패키지 매니저
- **Turborepo** - Monorepo 빌드 시스템

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
- [API 명세서](./docs/api/)
- [아키텍처 설명](./docs/architecture.md)

---

## 📄 License

MIT

---

**Made with ❤️ by Wonderland Team**
