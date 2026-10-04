import { Counter, Trend } from 'k6/metrics';

export const requestsSent = new Counter('requests_sent');

const trends = {};

export function registerTrend(tag) {
  if (!trends[tag]) {
    trends[tag] = new Trend(`duration_${tag.replace(/-/g, '_')}`, true);
  }
}

export function durationTrend(tag) {
  return trends[tag];
}
