import { resolveService } from './lib/services.js';
import { buildSpikeOptions, runGetOnly } from './lib/runner.js';
import { buildSummary } from './lib/summary.js';

const service = resolveService();
if (service.get.length === 0) {
  throw new Error(`Service '${service.name}' has no GET endpoints — spike scenario not applicable`);
}

export const options = buildSpikeOptions(service);

export default function () {
  runGetOnly(service);
}

export function handleSummary(data) {
  return buildSummary(data, { service: service.name, scenario: 'spike' });
}
