# Conference Tracker DB 모델 정의서

> 기준일: 2026-09-10  
> DBMS: Cloudflare D1(SQLite)  
> 관련 산출물: `api/openapi.yml`, `docs/conference-tracker.dbml`

## 1. 설계 원칙

1. **학회 시리즈와 연도별 회차 분리**  
   CHI라는 학회 시리즈와 CHI 2027이라는 실제 회차를 분리한다. `conference_series` 1건에 여러 `conferences` 회차가 연결된다.

2. **기준 CSV 원본 보존과 정규화 결과 분리**  
   CSV의 모든 행은 `conference_catalog_entries`에 보존한다. oral/poster/spotlight 등 중복 표현을 정규화한 대표 학회는 `conference_series`에 저장한다.

3. **공식 일정명을 그대로 저장**  
   고정된 일정 분류 체계를 강제하지 않고 `milestones.group_name`과 `milestones.title`에 학회가 발표한 명칭을 보존한다.

4. **시간대 의미 보존**  
   시각이 확인된 일정은 `event_at`에 UTC ISO 8601을 저장하고 `original_timezone`을 함께 보존한다. 날짜만 확인된 값은 `YYYY-MM-DD`, `time_confirmed=0`으로 저장한다.

5. **수집 스냅샷과 공개 데이터를 분리**  
   `schedule_feeds.payload`는 외부 수집 결과와 근거를 보관하고, 사용자에게 노출할 검증된 일정은 `milestones`에 저장한다. 수집 데이터는 선반영하되 관리자 수정값과 `HIDDEN` 상태를 보호한다.

6. **다대다 관계 명시**  
   학회-분야, 사용자-분야, 사용자-관심 학회, 학회-기관 관계를 연결 테이블로 표현한다.

## 2. 핵심 엔터티

| 엔터티 | 목적 | 주요 키 |
| --- | --- | --- |
| `users` | Google 로그인 사용자와 권한 | PK `id`, UK `external_user_id`, `email` |
| `user_sessions` | 30일 HttpOnly 로그인 세션 | PK `token`, FK `user_id` |
| `research_fields` | 계층형 ACM CCS 분야 | PK `id`, self FK `parent_id`, UK `acm_ccs_code` |
| `user_research_fields` | 사용자 관심 분야와 대표 분야 | PK `(user_id, research_field_id)` |
| `conference_series` | 정규화된 학회 시리즈 | PK `id`, UK `catalog_key` |
| `conference_catalog_entries` | CSV 원본 행과 평가 메타데이터 | PK `id`, UK `source_row`, FK `series_id` |
| `catalog_sync_state` | 기준 CSV의 최신 동기화 상태 | PK `id` |
| `conferences` | 연도별 학회 회차 | PK `id`, FK `series_id`, `verified_by` |
| `milestones` | 공식 일정과 원문 근거 | PK `id`, FK `conference_id` |
| `conference_links` | 홈페이지·제출·등록 링크 | PK `id`, FK `conference_id` |
| `conference_research_fields` | 학회 분야와 대표 분야 | PK `(conference_id, research_field_id)` |
| `pins` | 사용자의 관심 학회 | PK `(user_id, conference_id)` |
| `organizations` | 주최·후원 기관 | PK `id`, UK `name` |
| `conference_organizations` | 학회-기관 역할 관계 | PK `(conference_id, organization_id, role_name)` |
| `source_sites` | 관리자가 등록한 외부 출처 | PK `id`, UK `base_url` |
| `conference_sources` | 학회별 출처 URL | PK `id`, UK `(conference_id, source_url)` |
| `schedule_feeds` | CCF/공식 페이지 수집 설정과 최신 스냅샷 | PK `id`, UK `source_key` |

## 3. 관계와 카디널리티

| 부모 | 관계 | 자식 | 설명 |
| --- | --- | --- | --- |
| `users` | 1:N | `user_sessions` | 한 사용자는 여러 로그인 세션을 가질 수 있다. |
| `users` | N:M | `research_fields` | `user_research_fields`를 통해 관심 분야를 저장한다. |
| `users` | N:M | `conferences` | `pins`를 통해 관심 학회를 저장한다. |
| `conference_series` | 1:N | `conference_catalog_entries` | 여러 CSV 원본 행이 하나의 시리즈로 병합될 수 있다. |
| `conference_series` | 1:N | `conferences` | 시리즈는 연도별 회차를 가진다. |
| `conferences` | 1:N | `milestones` | 한 회차에는 여러 공식 일정이 있다. |
| `conferences` | 1:N | `conference_links` | 한 회차에는 여러 목적별 링크가 있다. |
| `conferences` | N:M | `research_fields` | 한 학회는 여러 ACM CCS 분야에 속한다. |
| `conferences` | N:M | `organizations` | 기관은 HOST, SPONSOR 등의 역할로 참여한다. |
| `conferences` | 1:N | `conference_sources` | 회차별 공식·보조 출처를 추적한다. |
| `conferences` | 1:N | `schedule_feeds` | CCF와 공식 페이지 수집 피드를 연결한다. |

## 4. 주요 무결성 규칙

- 공개 학회는 `status='PUBLISHED'`이며 최소 한 개의 확인 가능한 일정이 있어야 한다.
- 관리자가 `HIDDEN`으로 설정한 학회는 자동 수집이 다시 공개하지 않는다.
- `conference_series.catalog_key`는 DBLP Key를 기반으로 한 정규화 키이며 중복될 수 없다.
- CSV 원본 행은 `conference_catalog_entries.source_row`로 유일하게 식별한다.
- `pins`는 복합 PK로 같은 사용자가 같은 학회를 중복 저장하지 못하게 한다.
- 사용자와 학회의 대표 분야는 선택된 분야 중 하나여야 하며 애플리케이션 계층에서 최대 하나만 허용한다.
- `conference_links`는 같은 학회에서 동일한 유형과 URL이 중복되지 않는다.
- 일정 종료 시각은 시작 시각보다 빠를 수 없다.
- `source_text`는 LLM이 반환한 설명이 아니라 실제 원문에서 확인된 근거만 저장한다.
- 같은 학회·같은 의미·같은 날짜의 일정은 공식/관리자 일정이 CCF 일반 일정보다 우선한다.

## 5. 삭제 정책

- 사용자 삭제 시 세션, 관심 분야와 핀은 CASCADE 삭제한다.
- 학회 회차 삭제 시 분야 관계, 일정, 링크, 기관 관계, 출처, 피드를 CASCADE 삭제한다.
- 기준 카탈로그에서 사라진 원본 행과 시리즈는 물리 삭제 대신 `is_active=0`으로 비활성화한다.
- 운영에서는 학회 물리 삭제보다 `HIDDEN` 상태를 우선 사용한다.

## 6. API와 데이터 모델 연결

| API 기능 | 주요 테이블 |
| --- | --- |
| 공개 학회/캘린더 조회 | `conferences`, `milestones`, `conference_links`, `conference_research_fields`, `research_fields` |
| Google 로그인/내 정보 | `users`, `user_sessions` |
| 관심 분야 | `user_research_fields`, `research_fields` |
| 관심 학회 | `pins`, `conferences`, `milestones` |
| 관리자 학회 편집 | `conferences`, `milestones`, `conference_links`, `conference_research_fields` |
| 기준 CSV 동기화 | `conference_catalog_entries`, `conference_series`, `catalog_sync_state` |
| CCF·Gemini 자동 수집 | `schedule_feeds`, `milestones`, `conferences`, `conference_links` |
| 출처 관리 | `source_sites`, `conference_sources` |

## 7. 기존 모델에서 제외한 구조

기존 초안의 `collection_candidates`와 승인·반려 중심 검수 흐름은 현재 서비스 정책에서 제외한다. 외부 사용자로부터 신규 학회 요청을 받지 않으며, 검증된 자동 수집 결과를 먼저 공개한 뒤 관리자가 사후 보정한다. 기존 배포 DB에 호환 목적으로 테이블이 남아 있을 수 있으나 신규 논리 모델과 DBML에는 포함하지 않는다.

