import { config } from './config.js';

const REGISTRY = {
  // 'new-service': newService,
};

export function resolveService() {
  const name = config.service;
  const def = REGISTRY[name];
  if (!def) {
    const allowed = Object.keys(REGISTRY).join(', ');
    throw new Error(`Unknown SERVICE='${name}'. Allowed: ${allowed}`);
  }
  const baseUrl = (config.baseUrl && config.baseUrl.trim()) || def.baseUrl;
  if (!baseUrl) throw new Error(`No baseUrl for service '${name}'. Set BASE_URL env.`);

  const withBase = (req) => ({ ...req, url: baseUrl + req.url });

  return {
    name,
    baseUrl,
    get: (def.get || []).map(withBase),
    post: (def.post || []).map(withBase),
  };
}
