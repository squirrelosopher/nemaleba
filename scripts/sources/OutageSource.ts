import type { RawOutage } from '../../src/lib/domain/outage';
import type { Provider } from '../../src/lib/domain/provider';
import type { Utility } from '../../src/lib/domain/utility';

export interface OutageSource {
  readonly id: string;
  readonly utility: Utility;
  readonly label: string;
  readonly provider: Provider;
  readonly silenceIsExpected?: boolean;
  collect(): Promise<RawOutage[]>;

  // Sources that read more than one feed report the ones they could not read, so a
  // region falling out is visible instead of hiding inside the source's own total.
  unreadableFeeds?(): string[];

  // Sources whose feeds each cover part of their area name the branches an unreadable feed
  // leaves unknown, so only those cities are told their data is missing. `null`, or no
  // method at all, means a gap leaves the whole coverage unknown.
  unreadableBranches?(): string[] | null;
}
