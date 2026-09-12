import type { OutageSource } from './OutageSource';
import type { RawOutage } from '../../src/lib/domain/outage';
import type { Provider } from '../../src/lib/domain/provider';
import { Utility } from '../../src/lib/domain/utility';
import { parsePozarevacNotices } from '../parsing/vodovodPozarevac';
import { BROWSER_USER_AGENT, fetchText } from './httpClient';
import { warn } from './sourceLog';

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

  async collect(): Promise<RawOutage[]> {
    try {
      const page = await fetchText(NOTICES_URL, { userAgent: BROWSER_USER_AGENT });

      return parsePozarevacNotices(page, NOTICES_URL);
    } catch (error) {
      warn(`  skipped ${NOTICES_URL}: ${(error as Error).message}`);
      return [];
    }
  }
}
