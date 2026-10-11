# Conference Tracker

컴퓨터과학 분야의 주요 국제학술대회 일정을 자동으로 수집하고, 통합 캘린더를 통해 조회·관리할 수 있는 웹서비스입니다.

## 1. 프로젝트 개요

국제학술대회의 일정 정보가 여러 웹사이트에 분산되어 있어, 연구자가 논문 제출 및 학회 개최 일정을 일일이 확인해야 하는 문제를 해결하고자 개발했습니다.

**주요 기능**
- **학회 일정 통합 조회:** 논문 제출, 심사 결과 발표, 최종본 제출, 학회 개최 일정 등을 캘린더로 제공
- **학회 검색 및 필터링:** 학회명, 연구 분야, 개최 방식에 따른 검색 및 필터링
- **AI 기반 일정 자동 수집:** 외부 데이터와 학회 공식 홈페이지에서 정보를 수집하고 Gemini API를 활용해 구조화
- **개인화 기능:** Google 로그인 기반 관심 학회 저장 및 관심 연구 분야 관리
- **관리자 기능:** 수집 데이터 확인, 학회 정보 수정 및 일정 관리

## 2. 기술 스택

| 구분 | 기술 |
|---|---|
| Language | TypeScript |
| Full-stack Framework | Next.js |
| Serverless | Cloudflare Workers |
| Database | Cloudflare D1 (SQLite) |
| AI | Google Gemini API |

## 3. 아키텍처

### 시스템 구성

- **Frontend:** Next.js 기반 학회 검색, 캘린더 및 사용자 인터페이스 구현
- **Backend:** Next.js REST API를 통한 학회 데이터 조회, 사용자 인증 및 비즈니스 로직 처리
- **Data Collection:** Cloudflare Workers의 예약 실행을 이용한 외부 학회 일정 자동 수집
- **AI Processing:** Gemini API를 활용한 학회 공식 홈페이지의 비정형 일정 데이터 구조화 및 검증
- **Database:** Cloudflare D1을 통한 학회 정보, 일정, 사용자 및 수집 데이터 관리

### 데이터 처리 흐름

```text
[외부 데이터 소스]
  ├─ GitHub Gist CSV (학회 목록)
  ├─ CCF-Deadlines (기본 일정)
  └─ 학회 공식 홈페이지 (상세 일정)
                 │
                 ▼
[데이터 수집 및 처리]
  ├─ 학회 정보 매칭 및 정규화
  ├─ Gemini API 기반 일정 구조화
  └─ 일정 검증 및 중복 제거
                 │
                 ▼
[Cloudflare D1]
  └─ 학회·일정·사용자 데이터 저장
                 │
                 ▼
[Next.js REST API]
  └─ 데이터 조회 및 비즈니스 로직 처리
                 │
                 ▼
[Next.js Frontend]
  ├─ 통합 캘린더 및 학회 검색
  ├─ 관심 학회 관리
  └─ 관리자 대시보드
```

Cloudflare Workers의 예약 작업을 통해 외부 데이터를 주기적으로 수집하며, 검증된 일정을 데이터베이스에 반영합니다. 관리자는 수집 결과를 확인하고 필요한 정보를 수정할 수 있습니다.
