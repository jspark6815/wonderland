# 🎪 Wonderland

> AI가 안내하는 놀라운 장소 발견 플랫폼

## 🚀 시작하기

### 필수 요구사항

- Node.js 18+
- pnpm 8+
- Docker & Docker Compose

### 설치 및 실행

```bash
# 1. 저장소 클론
git clone <repository-url>
cd wonderland

# 2. 의존성 설치
pnpm install

# 3. 환경변수 설정
cp .env.example .env
# .env 파일을 열어서 필요한 값들을 입력하세요

# 4. Docker 컨테이너 실행
pnpm run docker:dev

# 5. Ollama 모델 다운로드
docker exec -it wonderland-ollama ollama pull llama3.1:8b

# 6. 개발 서버 실행
pnpm run dev
```

이제 다음 주소에서 접속 가능합니다:

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- Swagger UI: http://localhost:3000/api/docs

### 개별 실행

```bash
# Frontend만 실행
pnpm run dev:frontend

# Backend만 실행
pnpm run dev:backend
```

## 📚 문서

- [프로젝트 구조](./.cursor/structure.mdc)
- [코딩 컨벤션](./.cursor/conventions.mdc)
- [API 명세서](./docs/api/)
- [아키텍처 설명](./docs/architecture.md)

## 🛠 기술 스택

### Frontend

- React 18 + TypeScript
- Vite
- TanStack Query
- Zustand
- Tailwind CSS
- Naver Maps API

### Backend

- NestJS + TypeScript
- TypeORM
- PostgreSQL + PostGIS
- Redis
- Ollama (Llama 3.1)
- Swagger

## 📁 프로젝트 구조

```
wonderland/
├── apps/
│   ├── frontend/     # React 앱
│   └── backend/      # NestJS 앱
├── packages/
│   └── shared/       # 공통 타입/상수/유틸
├── docker/           # Docker 설정
└── docs/             # 문서
```

## 🎯 주요 기능

- 🗺️ Naver Map 기반 지도
- 🔍 키워드 및 위치 기반 검색
- 🤖 AI 기반 장소 추천
- 💬 자연어 검색
- ⭐ 리뷰 AI 요약

## 📄 License

MIT
# wonderland