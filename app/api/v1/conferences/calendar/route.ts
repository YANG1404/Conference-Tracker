import { normalizeScheduleDate, overlaps } from '@/lib/schedule-time';
import { error, json } from '@/lib/api';
import { getConferenceViews } from '@/lib/conference-service';
import { getRepositoryUser } from '@/lib/google-auth';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const from = url.searchParams.get('date_from');
    const to = url.searchParams.get('date_to');
    if (
      !from ||
      !to ||
      !/^\d{4}-\d{2}-\d{2}$/.test(from) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(to) ||
      !Number.isFinite(Date.parse(from)) ||
      !Number.isFinite(Date.parse(to)) ||
      from > to ||
      Date.parse(to) - Date.parse(from) > 370 * 86400000
    )
      return error(400, 'INVALID_PARAMETER', '올바른 조회 기간이 필요합니다.');
    try {
      normalizeScheduleDate(from, 'UTC', false);
      normalizeScheduleDate(to, 'UTC', false);
    } catch {
      return error(400, 'INVALID_PARAMETER', '존재하는 날짜를 입력하세요.');
    }
    const conferences = await getConferenceViews(
      await getRepositoryUser(request),
    );
    return json({
      items: conferences.filter((conference) =>
        conference.milestones.some((milestone) =>
          overlaps(milestone, from, to),
        ),
      ),
      date_from: from,
      date_to: to,
      timezone: 'Asia/Seoul',
    });
  } catch {
    return error(500, 'INTERNAL_ERROR', '캘린더 일정을 불러오지 못했습니다.');
  }
}
