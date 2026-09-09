const ref = (name: string) => ({ $ref: '#/components/schemas/' + name });
const json = (schema: object) => ({ 'application/json': { schema } });
const response = (schema: object) => ({
  description: '성공',
  content: json(schema),
});
const date = { type: 'string', format: 'date' };
const nullable = { type: ['string', 'null'] };
const milestone = {
  type: 'object',
  required: ['title', 'event_at', 'original_timezone', 'time_confirmed'],
  properties: {
    id: { type: 'integer' },
    type: {
      type: 'string',
      description: '기존 호환 필드. 일정 분류 필터로 사용하지 않음.',
    },
    group_name: nullable,
    title: { type: 'string' },
    event_at: {
      type: 'string',
      description:
        '시각 확정: UTC ISO 8601. 날짜만 확정: YYYY-MM-DD. 관리자 입력은 original_timezone의 local datetime도 허용.',
    },
    end_at: {
      ...nullable,
      description: '선택적 종료 일시. 날짜 범위는 종료 날짜 포함.',
    },
    original_timezone: {
      type: 'string',
      examples: ['AoE', 'UTC-12', 'Asia/Seoul', 'UNSPECIFIED'],
    },
    time_confirmed: { type: 'boolean' },
    d_day: { type: 'integer', readOnly: true },
    source_url: nullable,
    source_text: nullable,
    source_kind: nullable,
    external_key: nullable,
  },
};
const errors = Object.fromEntries(
  [400, 401, 403, 404, 422, 502].map((status) => [
    String(status),
    {
      description: '입력·권한·리소스·외부 수집 오류',
      content: json(ref('Error')),
    },
  ]),
);
const session = [{ session: [] }];
export function GET() {
  return Response.json({
    openapi: '3.1.0',
    info: {
      title: 'Conference Tracker — Calendar & Collection API',
      version: '2.0.0',
      description:
        '이번 구현의 캘린더·일정 편집·수집 계약. 날짜-only 데이터는 UTC 자정으로 변환하지 않습니다. 구 버전 설계 문서의 회원가입·승인 큐는 이 명세의 대상이 아닙니다.',
    },
    servers: [{ url: '/api/v1' }],
    paths: {
      '/conferences/calendar': {
        get: {
          summary: '공개 학회 중 조회 기간과 겹치는 일정이 있는 학회 조회',
          parameters: ['date_from', 'date_to'].map((name) => ({
            name,
            in: 'query',
            required: true,
            schema: date,
            description: 'KST 기준, 양끝 포함. 최대 370일.',
          })),
          responses: {
            '200': response({
              type: 'object',
              properties: {
                items: { type: 'array', items: ref('Conference') },
                date_from: date,
                date_to: date,
                timezone: { const: 'Asia/Seoul' },
              },
            }),
            ...errors,
          },
        },
      },
      '/conferences/{conference_id}': {
        get: {
          summary: '공개 학회 상세',
          parameters: [
            {
              name: 'conference_id',
              in: 'path',
              required: true,
              schema: { type: 'integer', minimum: 1 },
            },
          ],
          responses: { '200': response(ref('Conference')), ...errors },
        },
      },
      '/admin/schedules': {
        get: {
          summary: '수집 설정·원문 근거·스냅샷·실행 상태 조회',
          security: session,
          parameters: [
            { name: 'conference_id', in: 'query', schema: { type: 'integer' } },
          ],
          responses: {
            '200': response({
              type: 'object',
              properties: {
                items: { type: 'array', items: ref('Feed') },
                gemini_configured: { type: 'boolean' },
                model: { type: 'string' },
              },
            }),
            ...errors,
          },
        },
        post: {
          summary: 'CCF 동기화 / Gemini 추출 / 수집 설정 / 갱신 예정 처리',
          security: [...session, { schedulerToken: [] }],
          description:
            '세션 요청은 동일 Origin 필요. ccf 응답 next_cursor가 있으면 같은 요청을 재호출하여 다음 100개 회차를 처리합니다. 수집은 공개 일정을 직접 수정하지 않습니다.',
          requestBody: {
            required: true,
            content: json({
              oneOf: [
                {
                  type: 'object',
                  required: ['action'],
                  properties: { action: { enum: ['ccf', 'due'] } },
                },
                {
                  type: 'object',
                  required: ['action', 'feed_id'],
                  properties: {
                    action: { const: 'official' },
                    feed_id: { type: 'integer' },
                  },
                },
                {
                  type: 'object',
                  required: ['action', 'conference_id', 'url', 'enabled'],
                  properties: {
                    action: { const: 'configure' },
                    conference_id: { type: 'integer' },
                    url: { type: 'string', format: 'uri' },
                    enabled: { type: 'boolean' },
                  },
                },
              ],
            }),
          },
          responses: {
            '200': response({
              oneOf: [
                { type: 'object' },
                { type: 'array', items: { type: 'object' } },
              ],
              description:
                '수집 결과, unchanged 또는 CCF 누적 건수/next_cursor. due는 실행 결과 배열.',
            }),
            ...errors,
          },
        },
      },
      '/admin/conferences/{conference_id}': {
        parameters: [
          {
            name: 'conference_id',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
          },
        ],
        get: {
          summary: '공개·임시·숨김 학회 편집 데이터',
          security: session,
          responses: { '200': response(ref('ConferenceDraft')), ...errors },
        },
        patch: {
          summary: '학회 및 일정 편집본을 원자적으로 저장',
          security: session,
          description:
            '관계 필드(milestones, links, research_field_ids)는 전체 편집본을 전달합니다. 기존 일정은 id를 유지합니다. PUBLISHED 저장 시 공개됩니다.',
          requestBody: {
            required: true,
            content: json(ref('ConferenceDraft')),
          },
          responses: { '200': response(ref('ConferenceDraft')), ...errors },
        },
      },
    },
    components: {
      securitySchemes: {
        session: { type: 'apiKey', in: 'cookie', name: 'ct_session' },
        schedulerToken: {
          type: 'http',
          scheme: 'bearer',
          description:
            '서버 전용 SCHEDULE_SYNC_TOKEN. 브라우저에 저장하지 마세요.',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            code: { type: 'string' },
            message: { type: 'string' },
            trace_id: { type: 'string' },
          },
        },
        Milestone: milestone,
        Conference: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            acronym: nullable,
            edition_year: { type: ['integer', 'null'] },
            country_code: { type: 'string' },
            city: nullable,
            description: nullable,
            format: { enum: ['ONSITE', 'ONLINE', 'HYBRID', 'UNKNOWN'] },
            status: { const: 'PUBLISHED' },
            research_fields: { type: 'array', items: { type: 'object' } },
            milestones: { type: 'array', items: ref('Milestone') },
            links: { type: 'array', items: { type: 'object' } },
            is_pinned: { type: 'boolean' },
            is_domestic: { type: 'boolean' },
            d_day: { type: ['integer', 'null'] },
          },
        },
        ConferenceDraft: {
          type: 'object',
          required: ['name', 'country_code', 'format'],
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            acronym: nullable,
            edition_year: { type: ['integer', 'null'] },
            description: nullable,
            country_code: { type: 'string' },
            city: nullable,
            venue: nullable,
            format: { enum: ['ONSITE', 'ONLINE', 'HYBRID', 'UNKNOWN'] },
            status: { enum: ['DRAFT', 'PUBLISHED', 'HIDDEN'] },
            research_field_ids: { type: 'array', items: { type: 'integer' } },
            primary_research_field_id: { type: ['integer', 'null'] },
            milestones: { type: 'array', items: ref('Milestone') },
            links: {
              type: 'array',
              items: {
                type: 'object',
                required: ['type', 'label', 'url'],
                properties: {
                  type: { type: 'string' },
                  label: { type: 'string' },
                  url: { type: 'string', format: 'uri' },
                  is_active: { type: 'boolean' },
                },
              },
            },
          },
        },
        Feed: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            conference_id: { type: ['integer', 'null'] },
            kind: { enum: ['CCF_INDEX', 'CCF', 'OFFICIAL'] },
            url: { type: 'string' },
            enabled: { type: 'integer', enum: [0, 1] },
            status: { type: 'string' },
            last_checked_at: nullable,
            last_success_at: nullable,
            next_check_at: nullable,
            error_message: nullable,
            payload: {
              type: ['object', 'null'],
              properties: {
                milestones: { type: 'array', items: ref('Milestone') },
                warnings: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
      },
    },
  });
}
