const rtf = new Intl.RelativeTimeFormat('en', {numeric: 'auto'});

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

export function formatRelativeTime(
  ts: number,
  now: number = Date.now(),
): string {
  if (!ts || ts <= 0) return 'Unvisited';
  const diff = ts - now;
  const abs = Math.abs(diff);
  if (abs < MIN) {
    return rtf.format(Math.round(diff / 1000), 'second');
  }
  if (abs < HOUR) return rtf.format(Math.round(diff / MIN), 'minute');
  if (abs < DAY) return rtf.format(Math.round(diff / HOUR), 'hour');
  if (abs < WEEK) return rtf.format(Math.round(diff / DAY), 'day');
  if (abs < MONTH) return rtf.format(Math.round(diff / WEEK), 'week');
  if (abs < YEAR) return rtf.format(Math.round(diff / MONTH), 'month');
  return rtf.format(Math.round(diff / YEAR), 'year');
}
