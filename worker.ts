import handler from 'vinext/server/fetch-handler';
import { collectDue } from './lib/schedule-repository';

const worker = {
  fetch: handler.fetch,
  async scheduled(
    _event: ScheduledEvent,
    _env: Cloudflare.Env,
    context: ExecutionContext,
  ) {
    context.waitUntil(
      collectDue().then((results) =>
        console.info('schedule-collection', results),
      ),
    );
  },
};

export default worker;
