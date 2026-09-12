import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

export const LOG_PATH = 'static/data/notified.json';
export const RETAINED_ENTRIES = 4000;

export class NotificationLog {
  private constructor(private readonly delivered: Set<string>) {}

  static async open(): Promise<NotificationLog> {
    try {
      const stored = JSON.parse(await readFile(LOG_PATH, 'utf-8')) as string[];
      return new NotificationLog(new Set(stored));
    } catch {
      return new NotificationLog(new Set());
    }
  }

  wasDelivered(outageId: string): boolean {
    return this.delivered.has(outageId);
  }

  record(outageId: string): void {
    this.delivered.add(outageId);
  }

  async save(): Promise<void> {
    const retained = [...this.delivered].slice(-RETAINED_ENTRIES);
    await mkdir(dirname(LOG_PATH), { recursive: true });
    await writeFile(LOG_PATH, `${JSON.stringify(retained)}\n`, 'utf-8');
  }
}
