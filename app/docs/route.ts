export function GET() {
  return new Response(
    `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Conference Tracker API</title><link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.32.15/swagger-ui.css"><style>body{margin:0;background:#fffdf4}header{padding:16px;color:#2f6b3f;font-family:sans-serif}header a{color:inherit}</style></head><body><header><a href="/">← 캘린더</a> · 캘린더/일정 수집 API 명세 · 관리자 API는 먼저 사이트에서 Google 로그인하세요.</header><div id="swagger-ui"></div><script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.32.15/swagger-ui-bundle.js"></script><script>SwaggerUIBundle({url:'/api/v1/openapi',dom_id:'#swagger-ui',withCredentials:true,validatorUrl:null,deepLinking:true});</script></body></html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  );
}
