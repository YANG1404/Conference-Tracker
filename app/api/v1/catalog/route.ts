import { error, json } from '@/lib/api';
import { getCatalogStatus, listCatalog } from '@/lib/catalog-repository';

export async function GET(request: Request) {
  try {
    const search = new URL(request.url).searchParams;
    const [catalog, status] = await Promise.all([
      listCatalog({
        query: search.get('q') ?? '',
        limit: Number(search.get('limit') ?? 50),
        offset: Number(search.get('offset') ?? 0),
      }),
      getCatalogStatus(),
    ]);
    return json({ ...catalog, status });
  } catch (cause) {
    console.error('catalog-list-failed', cause);
    return error(500, 'INTERNAL_ERROR', '학회 카탈로그를 불러오지 못했습니다.');
  }
}
