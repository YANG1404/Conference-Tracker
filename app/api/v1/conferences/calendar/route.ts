import { error, json } from '@/lib/api';
import { readAuthenticatedUser } from '@/lib/conference-repository';
import { getConferenceViews } from '@/lib/conference-service';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const from = url.searchParams.get('date_from');
    const to = url.searchParams.get('date_to');
    if (!from || !to || from > to) return error(400, 'INVALID_PARAMETER', '올바른 조회 기간이 필요합니다.');
    const conferences = await getConferenceViews(readAuthenticatedUser(request.headers));
    const events = conferences.flatMap((conference) => conference.milestones
      .filter((milestone) => milestone.event_at.slice(0, 10) >= from && milestone.event_at.slice(0, 10) <= to)
      .map((milestone) => ({ conference, milestone, d_day: conference.d_day, is_pinned: conference.is_pinned })));
    return json(events);
  } catch {
    return error(500, 'INTERNAL_ERROR', '캘린더 일정을 불러오지 못했습니다.');
  }
}
