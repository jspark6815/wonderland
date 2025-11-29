# CodeRabbit 검토 가이드

## 🤖 CodeRabbit 소개
CodeRabbit은 AI 기반 코드 리뷰 도구로, Pull Request를 자동으로 검토하고 개선 사항을 제안합니다.

## 📋 Wonderland 프로젝트 검토 설정

### 1. 주요 검토 영역

#### 🔧 백엔드 (NestJS)
- **NestJS 베스트 프랙티스**
  - 의존성 주입 패턴
  - 모듈 구조
  - 데코레이터 사용
  
- **API 설계**
  - RESTful 원칙 준수
  - 일관된 응답 형식
  - 적절한 HTTP 상태 코드
  
- **데이터베이스**
  - TypeORM 쿼리 최적화
  - PostGIS 지리공간 쿼리 성능
  - 트랜잭션 처리

- **AI 모듈**
  - 통합 안정성
  - 타임아웃 설정 (15초)
  - 프롬프트 엔지니어링

#### 🎨 프론트엔드 (React + Vite)
- **React 패턴**
  - 훅 규칙 준수
  - 컴포넌트 재사용성
  - 메모이제이션 적절성
  
- **상태 관리**
  - Zustand 스토어 구조
  - 상태 업데이트 최적화
  
- **네이버 지도**
  - 동적 스크립트 로딩
  - 마커 메모리 관리
  - 이벤트 리스너 정리

### 2. 자동 체크 항목

#### ✅ 코드 품질
```yaml
- TypeScript strict mode
- ESLint 규칙 준수
- Prettier 포맷팅
- 불필요한 console.log 제거
- 주석 처리된 코드 제거
```

#### 🔒 보안
```yaml
- 환경 변수 하드코딩 금지
- API 키 노출 방지
- SQL 인젝션 방지
- XSS 취약점 체크
```

#### ⚡ 성능
```yaml
- N+1 쿼리 문제
- 인덱스 누락
- 번들 크기 (< 500KB)
- 이미지 최적화
- 캐싱 전략
```

### 3. PR 라벨 자동화

| 경로 패턴 | 자동 라벨 |
|----------|-----------|
| `apps/backend/**` | `backend`, `api` |
| `apps/frontend/**` | `frontend`, `ui` |
| `**/ai/**` | `ai`, `llm` |
| `**/places/**` | `places`, `search` |
| `docker-compose.yml` | `infrastructure`, `docker` |
| `**/*.sql` | `database`, `migration` |

### 4. CodeRabbit 명령어

PR 코멘트에서 사용 가능한 명령어:

- `@coderabbitai /improve` - 코드 개선 제안
- `@coderabbitai /security` - 보안 검토
- `@coderabbitai /performance` - 성능 최적화 제안
- `@coderabbitai /test` - 테스트 코드 제안
- `@coderabbitai review` - 전체 리뷰 다시 실행
- `@coderabbitai summary` - 변경사항 요약

### 5. 평가 기준 (가중치)

| 기준 | 가중치 | 설명 |
|------|--------|------|
| RESTful API 설계 | 높음 | API 엔드포인트 설계 품질 |
| AI/LLM 활용 | 높음 | AI 기능 구현 및 활용도 |
| 효율화/최적화 | 높음 | 코드 효율성, 쿼리 최적화 |
| 타입 안정성 | 중간 | TypeScript 타입 정의 |
| 코드 재사용성 | 중간 | 컴포넌트/함수 재사용성 |

## 🚀 설정 적용 방법

### 1. GitHub 저장소에 CodeRabbit 설치
1. [CodeRabbit GitHub App](https://github.com/apps/coderabbitai) 방문
2. "Install" 클릭
3. `jspark6815/wonderland` 저장소 선택

### 2. 설정 파일 커밋
```bash
git add .coderabbit.yaml
git commit -m "chore: CodeRabbit 검토 설정 추가"
git push origin main
```

### 3. PR 생성 시 자동 리뷰
- PR 생성 시 자동으로 CodeRabbit이 리뷰 시작
- 약 1-3분 내 리뷰 코멘트 생성

## 📊 리뷰 결과 해석

### 리뷰 카테고리
- 🔴 **Critical**: 즉시 수정 필요
- 🟠 **Major**: 중요한 개선사항
- 🟡 **Minor**: 선택적 개선사항
- 🟢 **Info**: 정보성 코멘트

### 리뷰 예시
```markdown
🔴 Critical: SQL 인젝션 취약점
파라미터 바인딩을 사용하세요:
\`\`\`typescript
// 변경 전
query(\`SELECT * FROM places WHERE name = '\${name}'\`)

// 변경 후
query('SELECT * FROM places WHERE name = ?', [name])
\`\`\`
```

## 🔧 커스터마이징

### 특정 파일 제외
`.coderabbit.yaml`의 `ignore_patterns`에 추가:
```yaml
ignore_patterns:
  - "*.generated.ts"
  - "migrations/*.sql"
```

### 리뷰 스타일 변경
```yaml
review_style:
  tone: "friendly"  # constructive, friendly, direct
  detail_level: "medium"  # low, medium, high
  language: "english"  # korean, english
```

## 💡 베스트 프랙티스

1. **PR 크기 관리**
   - 작은 단위로 PR 생성 (< 400줄)
   - 단일 기능/버그 수정에 집중

2. **PR 설명 작성**
   - 변경 이유 명확히 설명
   - 테스트 방법 포함
   - 관련 이슈 링크

3. **리뷰 응답**
   - CodeRabbit 제안사항 검토
   - 필요시 코멘트로 설명
   - 수정사항 커밋 후 재리뷰 요청

## 📚 참고 자료

- [CodeRabbit 공식 문서](https://docs.coderabbit.ai)
- [YAML 설정 가이드](https://docs.coderabbit.ai/configuration)
- [명령어 레퍼런스](https://docs.coderabbit.ai/commands)
