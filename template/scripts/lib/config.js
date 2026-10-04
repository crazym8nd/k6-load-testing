const preAllocatedVUs = parseInt(__ENV.PRE_ALLOCATED_VUS || '10');

export const config = {
  service: __ENV.SERVICE || '',
  baseUrl: __ENV.BASE_URL || '',
  rate: parseInt(__ENV.RATE || '5'),
  duration: __ENV.DURATION || '2m',
  preAllocatedVUs,
  maxVUs: parseInt(__ENV.MAX_VUS || String(preAllocatedVUs * 40)),
  gracefulStop: __ENV.GRACEFUL_STOP || '30s',
  sloP95Ms: parseInt(__ENV.SLO_P95_MS || '500'),
};
