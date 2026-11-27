import type { OutageSource } from './OutageSource';
import type { RawOutage } from '../../src/lib/domain/outage';
import type { Provider } from '../../src/lib/domain/provider';
import { Utility } from '../../src/lib/domain/utility';
import { parseBvkFaults, parseBvkPlannedWorks } from '../parsing/bvkPages';
import { fetchText } from './httpClient';
import { FeedReadings } from './feedReadings';

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

  // Faults and planned works are separate pages, and Belgrade losing one must show as a
  // gap, not as a city with no faults.
  private readings = new FeedReadings();

  async collect(): Promise<RawOutage[]> {
    this.readings.start();

    const [faults, planned] = await Promise.all([
      this.readings.read(FAULTS_URL, async () => parseBvkFaults(await fetchText(FAULTS_URL), FAULTS_URL)),
      this.readings.read(PLANNED_URL, async () =>
        parseBvkPlannedWorks(await fetchText(PLANNED_URL), PLANNED_URL)
      )
    ]);

    return [...faults, ...planned];
  }

  unreadableFeeds(): string[] {
    return this.readings.unreadable();
  }
}
