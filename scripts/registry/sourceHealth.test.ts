import { describe, expect, it } from 'vitest';
import { findRegressions, record, type SourceHealth } from './sourceHealth';

const NOBODY_EXEMPT = new Set<string>();
const NINE = new Date('2026-11-27T08:00:00Z');
const TEN = new Date('2026-11-27T09:00:00Z');

describe('source health', () => {
  it('keeps the last readable count and time through an unreadable run', () => {
    const readable = record({}, 'novi-sad', 41, [], NINE);
    const blocked = record({ 'novi-sad': readable }, 'novi-sad', 0, ['not JSON'], TEN);

    expect(blocked.readableEntries).toBe(41);
    expect(blocked.lastReadAt).toBe(NINE.toISOString());
  });

  // Novi Sad was unreadable at 12:00 and recorded 0. If its parser broke before 13:00, the
  // 13:00 run compared 0 against 0 and published "no outages" for the whole city.
  it('flags a parser falling silent right after an unreadable run', () => {
    const readable = record({}, 'novi-sad', 41, [], NINE);
    const blocked = record({ 'novi-sad': readable }, 'novi-sad', 0, ['not JSON'], TEN);
    const previous: SourceHealth = { 'novi-sad': blocked };
    const current: SourceHealth = { 'novi-sad': record(previous, 'novi-sad', 0) };

    expect(findRegressions(previous, current, NOBODY_EXEMPT)).toEqual([
      'novi-sad returned 0 entries, previously 41'
    ]);
  });

  it('reads records written before readableEntries existed', () => {
    const legacyReadable: SourceHealth = {
      ruma: { entries: 11, lastNonEmpty: '2026-11-26', lastComplete: '2026-11-26' }
    };
    const legacyBlocked: SourceHealth = {
      ruma: { entries: 0, lastNonEmpty: '2026-11-26', unreadable: ['x'], lastComplete: null }
    };

    expect(findRegressions(legacyReadable, { ruma: record(legacyReadable, 'ruma', 0) }, NOBODY_EXEMPT)).toHaveLength(1);
    expect(findRegressions(legacyBlocked, { ruma: record(legacyBlocked, 'ruma', 0) }, NOBODY_EXEMPT)).toHaveLength(0);
  });

  it('does not treat an unreadable run as a regression', () => {
    const previous: SourceHealth = { bor: record({}, 'bor', 4, [], NINE) };
    const current: SourceHealth = { bor: record(previous, 'bor', 0, ['403'], TEN) };

    expect(findRegressions(previous, current, NOBODY_EXEMPT)).toEqual([]);
  });
});
