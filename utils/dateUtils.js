// Utilities for timezone-aware date calculations (Asia/Dubai)

// UAE does not observe DST and is consistently UTC+4
export const DUBAI_TZ = 'Asia/Dubai';
export const DUBAI_OFFSET_MINUTES = 240; // +04:00

// Returns a Date representing the UTC moment that corresponds to
// 00:00:00 at the given Dubai local calendar day (defaults to today).
export function getDubaiStartOfDay(now = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: DUBAI_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = fmt.formatToParts(now);
  const year = Number(parts.find(p => p.type === 'year')?.value);
  const month = Number(parts.find(p => p.type === 'month')?.value);
  const day = Number(parts.find(p => p.type === 'day')?.value);

  // Midnight in Dubai (local) equals previous day 20:00 UTC (UTC-4 hours)
  const utcMs = Date.UTC(year, (month - 1), day, 0, 0, 0) - (DUBAI_OFFSET_MINUTES * 60 * 1000);
  return new Date(utcMs);
}

// Returns a Date representing the UTC cutoff for documents older than
// N full Dubai calendar days. That is: Dubai midnight today minus N days.
export function getDubaiStartOfDayCutoffDaysAgo(days, now = new Date()) {
  const startOfTodayDubaiUtc = getDubaiStartOfDay(now);
  const cutoffUtc = new Date(startOfTodayDubaiUtc.getTime() - (days * 24 * 60 * 60 * 1000));
  return cutoffUtc;
}

export function formatDubai(dt) {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: DUBAI_TZ,
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(dt);
  } catch {
    return dt?.toISOString?.() || String(dt);
  }
}
