import type { OutageSource } from './OutageSource';
import type { RawOutage } from '../../src/lib/domain/outage';
import type { Provider } from '../../src/lib/domain/provider';
import { Utility } from '../../src/lib/domain/utility';
import { parseLeskovacNotices } from '../parsing/vodovodLeskovac';
import { BROWSER_USER_AGENT, fetchText } from './httpClient';
import { warn } from './sourceLog';

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

  async collect(): Promise<RawOutage[]> {
    try {
      const page = await fetchText(NOTICES_URL, { userAgent: BROWSER_USER_AGENT });

      return parseLeskovacNotices(page, NOTICES_URL);
    } catch (error) {
      warn(`  skipped ${NOTICES_URL}: ${(error as Error).message}`);
      return [];
    }
  }
}
