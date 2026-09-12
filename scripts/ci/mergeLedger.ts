import { readFileSync, writeFileSync } from 'node:fs';
import { LOG_PATH, RETAINED_ENTRIES } from '../notify/notificationLog';

function read(path: string): string[] {
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf-8')) as unknown;

    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

const [committed] = process.argv.slice(2);

if (!committed) {
  throw new Error('usage: mergeLedger <committed-ledger.json>');
}

const merged = [...new Set([...read(committed), ...read(LOG_PATH)])].slice(-RETAINED_ENTRIES);

writeFileSync(LOG_PATH, `${JSON.stringify(merged)}\n`, 'utf-8');

console.log(`ledger holds ${merged.length} delivered outages`);
