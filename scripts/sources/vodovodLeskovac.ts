import type { OutageSource } from './OutageSource';
import type { RawOutage } from '../../src/lib/domain/outage';
import type { Provider } from '../../src/lib/domain/provider';
import { Utility } from '../../src/lib/domain/utility';
import { parseLeskovacNotices } from '../parsing/vodovodLeskovac';
import { fetchText } from './httpClient';

const NOTICES_URL = 'https://www.vodovodle.rs/servisne-informacije.php';

export class VodovodLeskovacSource implements OutageSource {
  readonly id = 'jkp-vodovod-leskovac';
  readonly utility = Utility.Water;
  readonly label = 'ЈКП Водовод Лесковац';
  readonly silenceIsExpected = true;

  readonly provider: Provider = {
    id: 'jkp-vodovod-leskovac',
    utility: Utility.Water,
    nameCyrillic: 'Водовод Лесковац',
    phone: '0800 012 016',
    url: 'https://www.vodovodle.rs/',
    coverage: ['leskovac']
  };

  // One page. A host that does not answer raises SourceUnreachable and is recorded as
  // unreadable by the pipeline; anything else is a parser bug and fails the run. Both used
  // to be swallowed here, which made a dead page look like a quiet town.
  async collect(): Promise<RawOutage[]> {
    return parseLeskovacNotices(await fetchText(NOTICES_URL), NOTICES_URL);
  }
}
