import { error, json } from '@/lib/api';
import { listResearchFields } from '@/lib/conference-repository';

export async function GET() {
  try {
    return json(await listResearchFields());
  } catch {
    return error(500, 'INTERNAL_ERROR', '연구 분야를 불러오지 못했습니다.');
  }
}
