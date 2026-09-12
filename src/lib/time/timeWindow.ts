import type { TimeWindow } from '$lib/domain/outage';
import type { MessageKey } from '$lib/i18n/messages';

const RANGE_SEPARATOR = '–';

export type Say = (key: MessageKey, values: Record<string, string>) => string;

// A range reads the same in every language, so only the one-ended forms are spoken. The
// words come from the caller because the two callers speak differently: the site renders
// in the locale of the page, the notifier in the locale each subscriber chose.
export function formatTimeWindow(time: TimeWindow, say: Say): string {
  if (time.start === null) {
    return say('timeUntil', { time: time.end });
  }

  return time.end === null
    ? say('timeFrom', { time: time.start })
    : `${time.start} ${RANGE_SEPARATOR} ${time.end}`;
}
