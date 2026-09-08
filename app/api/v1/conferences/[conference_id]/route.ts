import { error, json, parsePositiveId } from '@/lib/api';
import { readAuthenticatedUser } from '@/lib/conference-repository';
import { getConferenceViews } from '@/lib/conference-service';

export async function GET(request: Request, { params }: { params: Promise<{ conference_id: string }> }) {
  const id = parsePositiveId((await params).conference_id);
  if (!id) return error(400, 'INVALID_PARAMETER', 'conference_id가 올바르지 않습니다.');
  const item = (await getConferenceViews(readAuthenticatedUser(request.headers))).find((conference) => conference.id === id);
  return item ? json(item) : error(404, 'RESOURCE_NOT_FOUND', '학회를 찾을 수 없습니다.');
}
