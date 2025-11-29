# GitHub Issues & Pull Requests 생성 가이드

## 📋 이슈 목록

### Issue #1: 프로젝트 초기 설정 및 Docker 환경 구성
**Labels**: `setup`, `infrastructure`
**Description**:
- Monorepo 구조 설정 (pnpm + Turborepo)
- Docker Compose 환경 구성
- PostgreSQL + PostGIS, Redis, Ollama 설정
- 개발 환경 문서화

**Branch**: `feature/initial-setup`

### Issue #2: AI 모듈 구현 및 LLM 통합
**Labels**: `feature`, `ai`
**Description**:
- Ollama 서비스 통합
- AI 모듈 구현 (NestJS)
- LLM 모델 변경 (llama3.2:3b)
- AI 추천, 해석, 요약 기능

**Branch**: `feature/ai-integration`

### Issue #3: Places 모듈 및 하이브리드 검색 구현
**Labels**: `feature`, `backend`
**Description**:
- Places 엔티티 및 DB 스키마 생성
- 하이브리드 검색 (내부 DB + 네이버 API)
- PostGIS 지리공간 쿼리
- 시드 데이터 추가

**Branch**: `feature/places-search`

### Issue #4: 프론트엔드 UI/UX 구현
**Labels**: `feature`, `frontend`
**Description**:
- React + Vite 설정
- 네이버 지도 통합
- 검색 UI 구현
- AI 채팅 인터페이스

**Branch**: `feature/frontend-ui`

### Issue #5: 네이버 지도 API 업데이트 및 마커 시스템
**Labels**: `enhancement`, `frontend`
**Description**:
- 네이버 지도 API 키 형식 변경 (ncpClientId → ncpKeyId)
- 동적 스크립트 로딩
- 커스텀 마커 구현
- 지도 컨트롤 추가

**Branch**: `feature/map-integration`

## 🚀 실행 명령어

### 1. 브랜치 생성 및 커밋

```bash
# main 브랜치로 이동
git checkout main
git pull origin main

# Feature 1: 초기 설정
git checkout -b feature/initial-setup
git add .cursorrules .cursor/docker-dev.mdc docker-compose.yml .env.example
git add package.json pnpm-lock.yaml turbo.json
git commit -m "feat: 프로젝트 초기 설정 및 Docker 환경 구성

- Monorepo 구조 설정 (pnpm + Turborepo)
- Docker Compose로 PostgreSQL, Redis, Ollama 설정
- 개발 환경 문서화 (.cursor/docker-dev.mdc)
- 환경 변수 예제 파일 추가

Closes #1"

# Feature 2: AI 모듈
git checkout main
git checkout -b feature/ai-integration
git add apps/backend/src/modules/ai/
git add apps/backend/package.json
git commit -m "feat: AI 모듈 구현 및 Ollama LLM 통합

- Ollama 서비스 연동 (llama3.2:3b)
- AI 추천, 해석, 요약 기능 구현
- 스트리밍 응답 지원
- Swagger 문서화

Closes #2"

# Feature 3: Places 검색
git checkout main
git checkout -b feature/places-search
git add apps/backend/src/modules/places/
git add apps/backend/src/entities/
git add apps/backend/src/seeds/
git add packages/shared/src/types/place.types.ts
git commit -m "feat: Places 모듈 및 하이브리드 검색 시스템 구현

- PostGIS 지리공간 검색
- 내부 DB + 네이버 API 하이브리드 검색
- 10개 시드 데이터 추가
- 캐싱 시스템 구현

Closes #3"

# Feature 4: 프론트엔드 UI
git checkout main
git checkout -b feature/frontend-ui
git add apps/frontend/src/components/
git add apps/frontend/src/pages/
git add apps/frontend/src/hooks/
git add apps/frontend/src/store/
git add apps/frontend/src/api/
git add apps/frontend/index.html apps/frontend/src/App.tsx
git commit -m "feat: 프론트엔드 UI/UX 및 컴포넌트 구현

- 좌측 사이드바 + 우측 지도 레이아웃
- 검색 및 필터 UI
- AI 채팅 인터페이스
- 장소 리스트 및 상세 정보
- Zustand 상태 관리

Closes #4"

# Feature 5: 지도 통합
git checkout main
git checkout -b feature/map-integration
git add apps/frontend/src/utils/loadNaverMapScript.ts
git add apps/frontend/src/components/map/
git add apps/frontend/src/hooks/useIntegratedSearch.ts
git commit -m "feat: 네이버 지도 API 통합 및 마커 시스템 구현

- 새로운 API 키 형식 지원 (ncpKeyId)
- 동적 스크립트 로딩
- 번호 표시 커스텀 마커
- 줌/현재위치 컨트롤
- AI 검색 결과 지도 연동

Closes #5"
```

### 2. Pull Request 생성

각 브랜치를 GitHub에 푸시한 후:

```bash
# 각 브랜치 푸시
git push origin feature/initial-setup
git push origin feature/ai-integration
git push origin feature/places-search
git push origin feature/frontend-ui
git push origin feature/map-integration
```

### 3. GitHub에서 PR 생성

각 브랜치에 대해 Pull Request 생성:

#### PR #1: 프로젝트 초기 설정
**Title**: `feat: 프로젝트 초기 설정 및 Docker 환경 구성`
**Base**: `main` ← **Compare**: `feature/initial-setup`

#### PR #2: AI 모듈 구현
**Title**: `feat: AI 모듈 구현 및 Ollama LLM 통합`
**Base**: `main` ← **Compare**: `feature/ai-integration`

#### PR #3: Places 검색 시스템
**Title**: `feat: Places 모듈 및 하이브리드 검색 시스템`
**Base**: `main` ← **Compare**: `feature/places-search`

#### PR #4: 프론트엔드 UI
**Title**: `feat: 프론트엔드 UI/UX 구현`
**Base**: `main` ← **Compare**: `feature/frontend-ui`

#### PR #5: 지도 통합
**Title**: `feat: 네이버 지도 통합 및 마커 시스템`
**Base**: `main` ← **Compare**: `feature/map-integration`

## 📝 커밋 메시지 컨벤션

- `feat`: 새로운 기능 추가
- `fix`: 버그 수정
- `docs`: 문서 수정
- `style`: 코드 포맷팅
- `refactor`: 코드 리팩토링
- `test`: 테스트 추가
- `chore`: 빌드 업무 수정
