import { resolveService } from './lib/services.js';
import { buildStressOptions, runGetOnly } from './lib/runner.js';
import { buildSummary } from './lib/summary.js';

const service = resolveService();
if (service.get.length === 0) {
  throw new Error(`Service '${service.name}' has no GET endpoints — stress scenario not applicable`);
}

export const options = buildStressOptions(service);

export default function () {
  runGetOnly(service);
}

export function handleSummary(data) {
  return buildSummary(data, { service: service.name, scenario: 'stress' });
}
