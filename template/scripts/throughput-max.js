import { resolveService } from './lib/services.js';
import { buildOptions, runMixed } from './lib/runner.js';
import { buildSummary } from './lib/summary.js';

const service = resolveService();

export const options = buildOptions(service);

export default function () {
  runMixed(service);
}

export function handleSummary(data) {
  return buildSummary(data, { service: service.name, scenario: 'max' });
}
