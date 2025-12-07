# Wonderland 아키텍처

AI가 안내하는 놀라운 장소 발견 플랫폼의 전체 아키텍처 및 주요 컴포넌트 관계를 설명합니다.

## 목차

- [프로젝트 구조](#프로젝트-구조)
- [Backend 구조](#backend-구조)
- [Frontend 구조](#frontend-구조)
- [Shared 패키지](#shared-패키지)
- [데이터 흐름](#데이터-흐름)

---

## 프로젝트 구조

```
wonderland/
├── apps/
│   ├── backend/          # NestJS API 서버
│   └── frontend/         # React 프론트엔드
├── packages/
│   ├── shared/           # 공유 타입 및 유틸리티
│   └── eslint-config/    # 공유 ESLint 설정
├── docker/               # Docker 설정 파일
└── docs/                 # 프로젝트 문서
```

---

## Backend 구조

### 폴더 구조

```
apps/backend/src/
├── common/               # 공통 유틸리티
│   ├── decorators/       # 커스텀 데코레이터
│   ├── filters/          # 예외 필터
│   ├── guards/           # 인증/인가 가드
│   ├── interceptors/     # 인터셉터 (로깅 등)
│   ├── interfaces/       # 공통 인터페이스
│   └── pipes/            # 커스텀 파이프
├── config/               # 환경 설정 모듈
├── database/             # 데이터베이스 관련
│   ├── migrations/       # TypeORM 마이그레이션
│   └── seeds/            # 시드 데이터
├── entities/             # TypeORM 엔티티
├── modules/              # 기능별 모듈
│   ├── ai/               # AI/LLM 기능
│   ├── cache/            # 캐시 관리
│   ├── external/         # 외부 API 통합
│   ├── health/           # 헬스 체크
│   ├── logs/             # 로그 관리
│   ├── places/           # 장소 관리
│   └── search/           # 통합 검색
└── seeds/                # 시드 실행 스크립트
```

### 모듈별 용도

#### `common/decorators/`
커스텀 데코레이터를 정의합니다.

| 데코레이터 | 용도 |
|-----------|------|
| `@Public()` | 인증이 필요 없는 공개 API 표시 |
| `@CurrentUser()` | 현재 인증된 사용자 정보 추출 |
| `@Roles()` | 역할 기반 접근 제어 |
| `@CacheKey()` | 커스텀 캐시 키 설정 |

#### `common/interfaces/`
공통으로 사용되는 인터페이스를 정의합니다.

| 인터페이스 | 용도 |
|-----------|------|
| `PaginatedResponse<T>` | 페이지네이션 응답 형식 |
| `ApiResponse<T>` | 표준 API 응답 형식 |
| `SearchFilter` | 검색 필터 옵션 |

#### `common/pipes/`
입력값 변환 및 검증을 위한 커스텀 파이프입니다.

| 파이프 | 용도 |
|--------|------|
| `TrimPipe` | 문자열 공백 제거 |
| `ParseUUIDPipe` | UUID 형식 검증 |
| `SanitizeHtmlPipe` | XSS 방지를 위한 HTML 태그 제거 |

#### `config/`
환경별 설정을 모듈화합니다.

| 설정 파일 | 용도 |
|----------|------|
| `database.config.ts` | PostgreSQL 연결 설정 |
| `throttle.config.ts` | Rate Limiting 설정 |
| `cors.config.ts` | CORS 정책 설정 |
| `ai.config.ts` | LLM/Ollama 설정 |

#### `modules/cache/`
중앙 집중식 캐시 관리 모듈입니다.
- 현재 `PlacesCacheService`가 `modules/places/services/`에 위치
- 향후 공통 캐시 모듈로 분리 예정

#### `modules/external/`
외부 API 통합을 위한 추상화 레이어입니다.
- 현재 `NaverPlacesService`가 `modules/places/services/`에 위치
- 향후 Kakao, Google Maps 등 추가 시 통합 예정

#### `modules/health/`
애플리케이션 상태 확인을 위한 헬스 체크 모듈입니다.
- 현재 `/api/v1/ai/health` 엔드포인트가 `ai.controller.ts`에 위치
- Kubernetes liveness/readiness probe 지원 예정

#### `modules/search/`
통합 검색 기능을 위한 모듈입니다.
- AI 기반 자연어 검색
- 검색 자동완성
- 검색 히스토리 및 인기 검색어

#### `database/migrations/`
TypeORM 마이그레이션 파일을 관리합니다.
- 프로덕션 환경에서는 `synchronize: false` 필수
- 마이그레이션으로 스키마 변경 관리

#### `database/seeds/`
시드 데이터를 관리합니다.
- 개발/테스트 환경용 초기 데이터
- 환경별 시드 분리 (development, test, production)

---

## Frontend 구조

### 폴더 구조

```
apps/frontend/src/
├── api/                  # API 클라이언트
├── components/           # React 컴포넌트
│   ├── ai/               # AI 관련 컴포넌트
│   ├── common/           # 공통 컴포넌트
│   ├── map/              # 지도 컴포넌트
│   ├── places/           # 장소 관련 컴포넌트
│   └── search/           # 검색 컴포넌트
├── features/             # 기능별 로직
├── hooks/                # 커스텀 훅
├── pages/                # 페이지 컴포넌트
├── store/                # 상태 관리 (Zustand)
├── types/                # 타입 정의
└── utils/                # 유틸리티 함수
```

### `types/` 폴더 용도

프론트엔드 전용 타입을 정의합니다.

| 파일 | 용도 |
|------|------|
| `api.types.ts` | API 응답/요청 타입 |
| `map.types.ts` | 지도 관련 타입 (Bounds, Marker 등) |
| `ui.types.ts` | UI 컴포넌트 Props 타입 |

> **참고**: 백엔드와 공유하는 타입은 `packages/shared/src/types/`에 정의합니다.

---

## Shared 패키지

`packages/shared/`에는 프론트엔드와 백엔드에서 공유하는 코드가 있습니다.

### 타입 (`src/types/`)

```typescript
// place.types.ts
export interface Place { ... }
export interface BusinessHours { ... }
export interface SearchFilters { ... }
export interface Coordinates { ... }

// index.ts
export enum PlaceCategory { ... }
```

### 유틸리티 (`src/utils/`)

프론트엔드와 백엔드에서 공통으로 사용하는 유틸리티 함수

### 상수 (`src/constants/`)

공유 상수 값 (API 경로, 에러 코드 등)

---

## 데이터 흐름

### 장소 검색 플로우

```
[사용자 입력]
     │
     ▼
[Frontend] ─── POST /api/v1/ai/interpret ───▶ [AI Module]
     │                                              │
     │                                              ▼
     │                                    [자연어 쿼리 해석]
     │                                              │
     ◀────────────────────────────────────────────────
     │
     ▼
[Frontend] ─── GET /api/v1/places/search ───▶ [Places Module]
     │                                              │
     │                           ┌─────────────────┴─────────────────┐
     │                           ▼                                   ▼
     │                    [내부 DB 검색]                    [외부 API 검색]
     │                           │                                   │
     │                           └─────────────────┬─────────────────┘
     │                                             │
     ◀─────────────────────────────────────────────
     │
     ▼
[지도에 마커 표시]
```

### 캐싱 전략

1. **검색 결과**: 5분 캐시
2. **주변 장소**: 5분 캐시
3. **지도 영역 검색**: 10분 캐시

---

## 개발 가이드

### 새 모듈 추가 시

1. `modules/` 하위에 폴더 생성
2. `*.module.ts`, `*.controller.ts`, `*.service.ts` 생성
3. `app.module.ts`에 import 추가
4. 필요시 DTO 및 Entity 추가

### 새 공통 유틸리티 추가 시

1. 적절한 `common/` 하위 폴더에 파일 생성
2. 해당 폴더의 `index.ts`에 export 추가
3. `common/index.ts`에서 re-export

### 타입 추가 시

- 프론트엔드 전용: `apps/frontend/src/types/`
- 백엔드 전용: `apps/backend/src/common/interfaces/`
- 공유 타입: `packages/shared/src/types/`
