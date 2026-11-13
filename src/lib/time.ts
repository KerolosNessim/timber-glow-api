/** Day boundaries in Cairo time (Egypt has summer time, so the UTC offset is not fixed). */
const TZ = 'Africa/Cairo'

function cairoParts(at: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(at)
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value)
  return { y: get('year'), m: get('month'), d: get('day'), h: get('hour'), min: get('minute'), s: get('second') }
}

function offsetMs(at: Date) {
  const p = cairoParts(at)
  return Date.UTC(p.y, p.m - 1, p.d, p.h, p.min, p.s) - Math.floor(at.getTime() / 1000) * 1000
}

/** 00:00 Cairo time on the given calendar day (month is 1-based; day may overflow, like Date.UTC). */
export function cairoDayStart(y: number, m: number, d: number) {
  const guess = Date.UTC(y, m - 1, d)
  return new Date(guess - offsetMs(new Date(guess)))
}

export function cairoToday() {
  const p = cairoParts(new Date())
  return { y: p.y, m: p.m, d: p.d }
}

/** "2026-11-13" → that day's start in Cairo, or undefined for bad input. */
export function parseDay(value: string | undefined, plusDays = 0) {
  const match = value && /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return undefined
  return cairoDayStart(Number(match[1]), Number(match[2]), Number(match[3]) + plusDays)
}
