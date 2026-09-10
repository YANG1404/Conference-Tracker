import { error, json } from '@/lib/api';
import { getSessionUser } from '@/lib/google-auth';
import { getConferenceViews } from '@/lib/conference-service';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const session = await getSessionUser(request);
    const user = session
      ? { externalUserId: session.externalUserId, email: session.email }
      : null;
    const q = (url.searchParams.get('q') ?? '').trim().toLowerCase();
    const format = url.searchParams.get('format');
    const fieldIds = (url.searchParams.get('research_field_ids') ?? '')
      .split(',')
      .filter(Boolean)
      .map(Number);
    const pinnedOnly = url.searchParams.get('pinned_only') === 'true';
    if (pinnedOnly && !user)
      return error(
        401,
        'UNAUTHORIZED',
        '관심 학회 조회에는 로그인이 필요합니다.',
      );

    let items = await getConferenceViews(user);
    items = items.filter((item) => {
      const matchesQuery =
        !q ||
        item.name.toLowerCase().includes(q) ||
        (item.acronym ?? '').toLowerCase().includes(q);
      const matchesFormat = !format || item.format === format;
      const matchesField =
        fieldIds.length === 0 ||
        item.research_fields.some((field) => fieldIds.includes(field.id));
      const matchesPinned = !pinnedOnly || item.is_pinned;
      return (
        matchesQuery &&
        matchesFormat &&
        matchesField &&
        matchesPinned
      );
    });
    return json({
      items,
      page: {
        page: 0,
        size: items.length,
        total_elements: items.length,
        total_pages: items.length ? 1 : 0,
      },
    });
  } catch (cause) {
    console.error('conference-list-failed', cause);
    return error(500, 'INTERNAL_ERROR', '학회 목록을 불러오지 못했습니다.');
  }
}
