import type { OutageSource } from './OutageSource';
import type { RawOutage } from '../../src/lib/domain/outage';
import type { Provider } from '../../src/lib/domain/provider';
import { Utility } from '../../src/lib/domain/utility';
import { parseBvkFaults, parseBvkPlannedWorks } from '../parsing/bvkPages';
import { fetchText } from './httpClient';
import { warn } from './sourceLog';

const FAULTS_URL = 'https://www.bvk.rs/kvarovi-na-mrezi/';
const PLANNED_URL = 'https://www.bvk.rs/planirani-radovi/';

const BELGRADE_MUNICIPALITIES = [
  'beograd', 'vozdovac', 'vracar', 'grocka', 'zvezdara', 'zemun', 'lazarevac',
  'mladenovac', 'novi-beograd', 'obrenovac', 'palilula', 'rakovica',
  'savski-venac', 'sopot', 'stari-grad', 'surcin', 'cukarica', 'barajevo'
];

export class BvkBeogradSource implements OutageSource {
  readonly id = 'bvk-beograd';
  readonly utility = Utility.Water;
  readonly label = 'БВК Београд';

  readonly provider: Provider = {
    id: 'bvk-beograd',
    utility: Utility.Water,
    nameCyrillic: 'Београдски водовод',
    phone: '0800 110 011',
    url: FAULTS_URL,
    coverage: BELGRADE_MUNICIPALITIES
  };

  async collect(): Promise<RawOutage[]> {
    const [faults, planned] = await Promise.all([
      this.read(FAULTS_URL, parseBvkFaults),
      this.read(PLANNED_URL, parseBvkPlannedWorks)
    ]);

    return [...faults, ...planned];
  }

  private async read(
    url: string,
    parse: (html: string, sourceUrl: string) => RawOutage[]
  ): Promise<RawOutage[]> {
    try {
      return parse(await fetchText(url), url);
    } catch (error) {
      warn(`  skipped ${url}: ${(error as Error).message}`);
      return [];
    }
  }
}
