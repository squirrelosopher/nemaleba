import type { OutageSource } from './OutageSource';
import type { RawOutage } from '../../src/lib/domain/outage';
import type { Provider } from '../../src/lib/domain/provider';
import { Utility } from '../../src/lib/domain/utility';
import { parsePozarevacNotices } from '../parsing/vodovodPozarevac';
import { fetchText } from './httpClient';

const NOTICES_URL = 'https://vodovod012.rs/vesti';

export class VodovodPozarevacSource implements OutageSource {
  readonly id = 'jkp-vodovod-pozarevac';
  readonly utility = Utility.Water;
  readonly label = 'ЈКП Водовод и канализација Пожаревац';
  readonly silenceIsExpected = true;

  readonly provider: Provider = {
    id: 'jkp-vodovod-pozarevac',
    utility: Utility.Water,
    nameCyrillic: 'Водовод и канализација Пожаревац',
    phone: '012 555 187',
    url: 'https://vodovod012.rs/',
    coverage: ['pozarevac']
  };

  // One page. A host that does not answer raises SourceUnreachable and is recorded as
  // unreadable by the pipeline; anything else is a parser bug and fails the run. Both used
  // to be swallowed here, which made a dead page look like a quiet town.
  async collect(): Promise<RawOutage[]> {
    return parsePozarevacNotices(await fetchText(NOTICES_URL), NOTICES_URL);
  }
}
