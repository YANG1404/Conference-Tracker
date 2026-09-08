export function json(data: unknown, status = 200) {
  return Response.json(data, { status });
}

export function error(status: number, code: string, message: string) {
  return json(
    {
      code,
      message,
      trace_id: crypto.randomUUID().replaceAll('-', '').slice(0, 12),
    },
    status,
  );
}

export function parsePositiveId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}
