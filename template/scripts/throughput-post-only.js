import { resolveService } from './lib/services.js';
import { buildOptions, runPostOnly } from './lib/runner.js';
import { buildSummary } from './lib/summary.js';

const service = resolveService();
if (service.post.length === 0) {
  throw new Error(`Service '${service.name}' has no POST endpoints — post-only scenario not applicable`);
}

export const options = buildOptions(service);

export default function () {
  runPostOnly(service);
}

export function handleSummary(data) {
  return buildSummary(data, { service: service.name, scenario: 'post-only' });
}
