import { resolveService } from './lib/services.js';
import { runSmoke } from './lib/runner.js';

const service = resolveService();

export const options = {
  vus: 1,
  iterations: 1,
};

export default function () {
  console.log(`--- smoke test: service=${service.name}, baseUrl=${service.baseUrl} ---`);
  runSmoke(service);
}
