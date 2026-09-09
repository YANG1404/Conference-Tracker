import { DateTime, FixedOffsetZone } from 'luxon';

export const DISPLAY_ZONE = 'Asia/Seoul';

export function sourceZone(zone: string) {
  if (/^(AoE|Anywhere on Earth)$/i.test(zone.trim()))
    return FixedOffsetZone.instance(-720);
  const offset = /^(?:UTC|GMT)([+-])(\d{1,2})(?::(\d{2}))?$/i.exec(zone.trim());
  if (offset) {
    const minutes = Number(offset[2]) * 60 + Number(offset[3] || 0);
    if (minutes > 840) throw new Error('지원하지 않는 UTC 오프셋입니다.');
    return FixedOffsetZone.instance((offset[1] === '-' ? -1 : 1) * minutes);
  }
  if (!['UTC', 'GMT'].includes(zone) && !zone.includes('/'))
    throw new Error('AoE, UTC 오프셋 또는 IANA 시간대를 입력하세요.');
  return zone;
}

export function normalizeScheduleDate(
  value: string,
  zone: string,
  timed: boolean,
) {
  const input = value.trim().replace(' ', 'T');
  if (!timed) {
    const date = input.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !DateTime.fromISO(date).isValid)
      throw new Error('날짜가 올바르지 않습니다.');
    return date;
  }
  const date = DateTime.fromISO(input, {
    zone: sourceZone(zone),
    setZone: true,
  });
  if (!date.isValid || !input.includes('T'))
    throw new Error('일시 또는 시간대가 올바르지 않습니다.');
  // Reject nonexistent local wall-clock times, including the DST spring-forward gap.
  if (
    !/(Z|[+-]\d\d:\d\d)$/.test(input) &&
    date.toFormat("yyyy-MM-dd'T'HH:mm") !== input.slice(0, 16)
  )
    throw new Error('해당 시간대에 존재하지 않는 시각입니다.');
  return date.toUTC().toISO()!;
}

export function displayDay(value: string, timed = value.length > 10) {
  if (!timed) return value.slice(0, 10);
  return (
    DateTime.fromISO(value, { zone: 'UTC' })
      .setZone(DISPLAY_ZONE)
      .toISODate() ?? ''
  );
}

export function dayDifference(
  value: string,
  timed = value.length > 10,
  now = new Date(),
) {
  return Math.round(
    (Date.parse(displayDay(value, timed)) -
      Date.parse(displayDay(now.toISOString()))) /
      86400000,
  );
}

export function editDate(value: string, zone: string, timed: boolean) {
  if (!value) return '';
  if (!timed) return value.slice(0, 10);
  try {
    return DateTime.fromISO(value, { zone: 'UTC' })
      .setZone(sourceZone(zone))
      .toFormat("yyyy-MM-dd'T'HH:mm");
  } catch {
    return value.slice(0, 16);
  }
}

export function overlaps(
  event: {
    event_at: string;
    end_at?: string | null;
    time_confirmed?: boolean | number;
  },
  from: string,
  to: string,
) {
  return (
    displayDay(event.event_at, Boolean(event.time_confirmed)) <= to &&
    displayDay(event.end_at || event.event_at, Boolean(event.time_confirmed)) >=
      from
  );
}

export function monthGrid(year: number, month: number) {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const count = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return Array.from(
    { length: Math.ceil((first.getUTCDay() + count) / 7) * 7 },
    (_, i) => {
      const day = i - first.getUTCDay() + 1;
      return {
        day,
        valid: day > 0 && day <= count,
        date: new Date(Date.UTC(year, month - 1, day))
          .toISOString()
          .slice(0, 10),
      };
    },
  );
}
