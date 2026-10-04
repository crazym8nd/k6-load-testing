import { config } from './config.js';

function fmt(v) {
  return v == null ? 'N/A' : v.toFixed(2);
}

function trendKeys(metrics) {
  return Object.keys(metrics).filter((k) => k.startsWith('duration_'));
}

function textSummary(data, ctx) {
  const m = data.metrics;
  const dur = m.http_req_duration;
  const reqs = m.http_reqs;
  const errs = m.http_req_failed;
  const sent = m.requests_sent;
  const wait = m.http_req_waiting;
  const blocked = m.http_req_blocked;
  const dropped = m.dropped_iterations;
  const checks = m.checks;

  const lines = [
    '',
    `=== ${ctx.service.toUpperCase()} / ${ctx.scenario.toUpperCase()} RESULTS ===`,
    '',
    `Service:              ${ctx.service}`,
    `Scenario:             ${ctx.scenario}`,
    `Target rate:          ${config.rate} iterations/s`,
    `Duration:             ${config.duration}`,
    `Total HTTP requests:  ${reqs ? reqs.values.count : 'N/A'}`,
    `Total logical reqs:   ${sent ? sent.values.count : 'N/A'}`,
    `RPS (avg):            ${reqs ? fmt(reqs.values.rate) : 'N/A'}`,
    `Dropped iterations:   ${dropped ? dropped.values.count : 'N/A'}`,
    `Checks pass rate:     ${checks ? (checks.values.rate * 100).toFixed(2) : 'N/A'}%`,
    '',
    'Latency http_req_duration:',
    `  avg:   ${dur ? fmt(dur.values.avg) : 'N/A'} ms`,
    `  med:   ${dur ? fmt(dur.values.med) : 'N/A'} ms`,
    `  p90:   ${dur ? fmt(dur.values['p(90)']) : 'N/A'} ms`,
    `  p95:   ${dur ? fmt(dur.values['p(95)']) : 'N/A'} ms`,
    `  max:   ${dur ? fmt(dur.values.max) : 'N/A'} ms`,
    '',
    'Server wait (TTFB) http_req_waiting:',
    `  avg:   ${wait ? fmt(wait.values.avg) : 'N/A'} ms`,
    `  p95:   ${wait ? fmt(wait.values['p(95)']) : 'N/A'} ms`,
    '',
    'Blocked (conn) http_req_blocked:',
    `  avg:   ${blocked ? fmt(blocked.values.avg) : 'N/A'} ms`,
    '',
  ];

  for (const key of trendKeys(m)) {
    const t = m[key];
    lines.push(`Per-endpoint ${key}:`);
    lines.push(`  avg:   ${fmt(t.values.avg)} ms`);
    lines.push(`  p95:   ${fmt(t.values['p(95)'])} ms`);
    lines.push('');
  }

  lines.push(`Error rate: ${errs ? (errs.values.rate * 100).toFixed(2) : '0'}%`);
  lines.push('');
  lines.push('=====================================');
  lines.push('');
  return lines.join('\n');
}

export function buildSummary(data, ctx) {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `reports/summary-${ctx.service}-${ctx.scenario}-${ts}.json`;
  return {
    stdout: textSummary(data, ctx),
    [fileName]: JSON.stringify(data, null, 2),
  };
}
