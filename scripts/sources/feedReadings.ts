import type { RawOutage } from '../../src/lib/domain/outage';
import { SourceUnreachable } from './httpClient';
import { warn } from './sourceLog';

/**
 * Reads the separate feeds of one source (regions, days, categories, pages) so that a
 * feed nobody can reach is reported and the rest is kept.
 *
 * Only an unreachable host is forgiven here. Several sources used to catch everything
 * around fetch *and* parse, so a parser bug was reported as a quiet day (Leskovac,
 * Požarevac, BVK) or as a host refusing (EPS, Kragujevac), and a city lost its rows with
 * nothing failing. A parser throwing is a bug, and it propagates to fail the run.
 */
export class FeedReadings {
  private gaps: string[] = [];

  start(): void {
    this.gaps = [];
  }

  async read(label: string, work: () => Promise<RawOutage[]>): Promise<RawOutage[]> {
    return (await this.readFeed(label, work)).outages;
  }

  // Says whether this one feed failed. Feeds are read concurrently, so counting the shared
  // list before and after a read would also blame the feeds whose reads overlapped it.
  async readFeed(
    label: string,
    work: () => Promise<RawOutage[]>
  ): Promise<{ outages: RawOutage[]; failed: boolean }> {
    try {
      return { outages: await work(), failed: false };
    } catch (error) {
      if (!(error instanceof SourceUnreachable)) {
        throw error;
      }

      this.note(label, error.message);
      return { outages: [], failed: true };
    }
  }

  // For a feed that answered but cannot be read as what it claims to be, such as an EPS
  // page without the date heading every day's page carries.
  note(label: string, reason: string): void {
    warn(`  unreadable ${label}: ${reason}`);
    this.gaps.push(`${label}: ${reason}`);
  }

  unreadable(): string[] {
    return [...this.gaps];
  }
}
