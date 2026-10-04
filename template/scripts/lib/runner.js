import http from 'k6/http';
import { check } from 'k6';
import { config } from './config.js';
import { buildHeaders } from './headers.js';
import { requestsSent, durationTrend, registerTrend } from './metrics.js';

function uniqueByTag(list) {
  const seen = new Set();
  return list.filter((req) => {
    if (seen.has(req.tag)) return false;
    seen.add(req.tag);
    return true;
  });
}

function endpointThresholds(service) {
  const thresholds = {};
  for (const req of uniqueByTag([...service.get, ...service.post])) {
    const slo = req.sloP95Ms || config.sloP95Ms;
    thresholds[`http_req_duration{endpoint:'${req.tag}'}`] = [`p(95)<${slo}`];
  }
  return thresholds;
}

export function buildOptions(service) {
  for (const req of uniqueByTag([...service.get, ...service.post])) {
    registerTrend(req.tag);
  }
  return {
    summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
    scenarios: {
      constant_load: {
        executor: 'constant-arrival-rate',
        rate: config.rate,
        timeUnit: '1s',
        duration: config.duration,
        preAllocatedVUs: config.preAllocatedVUs,
        maxVUs: config.maxVUs,
        gracefulStop: config.gracefulStop,
      },
    },
    thresholds: {
      http_req_failed: ['rate<0.1'],
      dropped_iterations: ['count<1'],
      checks: ['rate>0.99'],
      ...endpointThresholds(service),
    },
  };
}

export function buildStressOptions(service) {
  for (const req of uniqueByTag([...service.get, ...service.post])) {
    registerTrend(req.tag);
  }
  const startRate = Math.max(1, parseInt(__ENV.STRESS_START || '100'));
  const step = Math.max(1, parseInt(__ENV.STRESS_STEP || '100'));
  const maxRate = Math.max(startRate, parseInt(__ENV.STRESS_MAX || '500'));
  const stepDuration = __ENV.STRESS_STEP_DURATION || '1m';
  const MAX_STEPS = 20;

  const stages = [];
  let rate = startRate;
  let n = 0;
  while (rate <= maxRate && n < MAX_STEPS) {
    stages.push({ duration: '30s', target: rate });
    stages.push({ duration: stepDuration, target: rate });
    rate += step;
    n++;
  }
  stages.push({ duration: '30s', target: 0 });

  return {
    summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
    scenarios: {
      stress: {
        executor: 'ramping-arrival-rate',
        startRate: 0,
        timeUnit: '1s',
        stages,
        preAllocatedVUs: config.preAllocatedVUs,
        maxVUs: config.maxVUs,
        gracefulStop: config.gracefulStop,
      },
    },
    thresholds: {
      http_req_failed: ['rate<0.1'],
      dropped_iterations: ['count<1'],
      checks: ['rate>0.99'],
      ...endpointThresholds(service),
    },
  };
}

export function buildSpikeOptions(service) {
  for (const req of uniqueByTag([...service.get, ...service.post])) {
    registerTrend(req.tag);
  }
  const base = Math.max(1, parseInt(__ENV.SPIKE_BASE || '100'));
  const peak = Math.max(base, parseInt(__ENV.SPIKE_PEAK || '500'));
  const hold = __ENV.SPIKE_HOLD || '2m';
  const recover = __ENV.SPIKE_RECOVER || '2m';

  const stages = [
    { duration: '1m', target: base },     // baseline
    { duration: '10s', target: peak },    // мгновенный скачок
    { duration: hold, target: peak },     // удержать пик
    { duration: '10s', target: base },    // сброс
    { duration: recover, target: base },  // проверка восстановления
    { duration: '30s', target: 0 },       // вниз
  ];

  return {
    summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
    scenarios: {
      spike: {
        executor: 'ramping-arrival-rate',
        startRate: 0,
        timeUnit: '1s',
        stages,
        preAllocatedVUs: config.preAllocatedVUs,
        maxVUs: config.maxVUs,
        gracefulStop: config.gracefulStop,
      },
    },
    thresholds: {
      http_req_failed: ['rate<0.1'],
      checks: ['rate>0.99'],
      // dropped_iterations и p95 не проверяем — на пике насыщение ожидаемо
    },
  };
}

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function execGet(req, headers) {
  const res = http.get(req.url, { headers, tags: { endpoint: req.tag } });
  check(res, { 'status 200': (r) => r.status === 200 });
  requestsSent.add(1);
  durationTrend(req.tag).add(res.timings.duration);
  return res;
}

function execPost(req, headers) {
  const bodyValue = typeof req.body === 'function' ? req.body() : req.body;
  const body = JSON.stringify(bodyValue);
  const res = http.post(req.url, body, { headers, tags: { endpoint: req.tag } });
  check(res, { 'status 200': (r) => r.status === 200 });
  requestsSent.add(1);
  durationTrend(req.tag).add(res.timings.duration);
  return res;
}

export function runMixed(service) {
  const headers = buildHeaders();
  if (service.get.length > 0) execGet(pickRandom(service.get), headers);
  if (service.post.length > 0) execPost(pickRandom(service.post), headers);
}

export function runGetOnly(service) {
  if (service.get.length === 0) {
    throw new Error(`Service '${service.name}' has no GET endpoints — get-only not applicable`);
  }
  execGet(pickRandom(service.get), buildHeaders());
}

export function runPostOnly(service) {
  if (service.post.length === 0) {
    throw new Error(`Service '${service.name}' has no POST endpoints — post-only not applicable`);
  }
  execPost(pickRandom(service.post), buildHeaders());
}

export function logRequestResponse(method, req, res) {
  console.log('========== REQUEST ==========');
  console.log(`${method} ${req.url}`);
  if (req.body) {
    const body = JSON.stringify(req.body);
    console.log(`Body (${body.length} bytes): ${body.substring(0, 1500)}${body.length > 1500 ? '...' : ''}`);
  }
  console.log('========== RESPONSE ==========');
  console.log(`Status: ${res.status} ${res.status_text || ''}`);
  if (res.body && res.body.length > 0) {
    console.log(`Body: ${res.body.substring(0, 1500)}${res.body.length > 1500 ? '...' : ''}`);
  }
  console.log(`Total: ${res.timings.duration.toFixed(2)} ms`);
  console.log('');
}

export function runSmoke(service) {
  const headers = buildHeaders();
  for (const req of uniqueByTag(service.get)) {
    const res = http.get(req.url, { headers });
    logRequestResponse('GET', req, res);
  }
  for (const req of uniqueByTag(service.post)) {
    const bodyValue = typeof req.body === 'function' ? req.body() : req.body;
    const body = JSON.stringify(bodyValue);
    const res = http.post(req.url, body, { headers });
    logRequestResponse('POST', { ...req, body: bodyValue }, res);
  }
}
