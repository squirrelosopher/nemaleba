import { mkdir, writeFile } from 'node:fs/promises';
import { fetchText } from '../sources/httpClient';

const DIRECTORY = 'data/fixtures';
const WORDPRESS_FIELDS = 'link,date,title,content';

interface Capture {
  name: string;
  url: string;
}

function wordPress(endpoint: string, category: number, perPage: number): string {
  return `${endpoint}?categories=${category}&per_page=${perPage}&_fields=${WORDPRESS_FIELDS}`;
}

// The URLs are written here rather than exported from the sources, so capturing cannot
// change what a source fetches. The cost is that a source moving leaves its fixture
// behind, which is harmless: a fixture exists to catch a parser changing its mind about
// bytes that have not, and a source that moved is what `sources.json` is for.
const CAPTURES: Capture[] = [
  {
    name: 'eps-beograd.html',
    url: 'https://elektrodistribucija.rs/planirana-iskljucenja-beograd/Dan_1_Iskljucenja.htm'
  },
  {
    name: 'eps-nis.html',
    url: 'https://elektrodistribucija.rs/planirana-iskljucenja-srbija/Nis_Dan_1_Iskljucenja.htm'
  },
  { name: 'bvk-faults.html', url: 'https://www.bvk.rs/kvarovi-na-mrezi/' },
  { name: 'bvk-planned.html', url: 'https://www.bvk.rs/planirani-radovi/' },
  {
    name: 'leskovac.html',
    url: 'https://www.vodovodle.rs/servisne-informacije.php'
  },
  {
    name: 'pozarevac.html',
    url: 'https://vodovod012.rs/vesti'
  },

  { name: 'naissus-nis.json', url: wordPress('https://jkpnaissus.co.rs/wp-json/wp/v2/posts', 42, 15) },
  {
    name: 'gornji-milanovac.json',
    url: wordPress('https://jkpgm.rs/wp-json/wp/v2/posts', 23, 10)
  },
  { name: 'novi-sad.json', url: wordPress('https://www.vikns.rs/wp-json/wp/v2/posts', 43, 20) },
  { name: 'kladovo.json', url: wordPress('https://jedinstvojp.rs/wp-json/wp/v2/posts', 14, 12) },
  { name: 'zrenjanin.json', url: wordPress('https://vikzr.rs/wp-json/wp/v2/posts', 113, 12) },
  { name: 'cacak.json', url: wordPress('https://vodovodca.rs/wp-json/wp/v2/posts', 3, 12) },
  {
    name: 'kragujevac-planned.json',
    url: wordPress('https://jkpvik-kg.com/wp-json/wp/v2/posts', 1, 20)
  },
  {
    name: 'kragujevac-emergency.json',
    url: wordPress('https://jkpvik-kg.com/wp-json/wp/v2/posts', 3, 20)
  },
  {
    name: 'indjija-faults.json',
    url: wordPress('https://vodovodindjija.co.rs/wp-json/wp/v2/posts', 1, 12)
  },
  {
    name: 'indjija-works.json',
    url: wordPress('https://vodovodindjija.co.rs/wp-json/wp/v2/posts', 52, 12)
  },
  { name: 'ruma.json', url: wordPress('https://vodovod-ruma.co.rs/wp-json/wp/v2/posts', 1, 20) },
  {
    name: 'sremska-mitrovica.json',
    url: wordPress('https://www.vodovodsm.rs/wp-json/wp/v2/posts', 17, 15)
  },
  {
    name: 'vranje.json',
    url: wordPress('https://vodovodvranje.rs/wp-json/wp/v2/posts', 8, 15)
  },
  {
    name: 'pancevo.json',
    url: wordPress('https://www.vodovodpa.rs/wp-json/wp/v2/posts', 7, 15)
  },
  // Four sources answer the collector's own user agent with an error or a stub and a
  // browser one with the page. Capturing under the agent each source really sends is
  // what keeps a fixture the bytes its parser will actually be handed.
  {
    name: 'valjevo.json',
    url: wordPress('https://vodovodva.co.rs/wp-json/wp/v2/posts', 1, 15)
  },

  {
    name: 'bor.json',
    url: wordPress('https://vodovodbor.com/wp-json/wp/v2/posts', 22, 6)
  }
];

async function capture({ name, url }: Capture): Promise<boolean> {
  try {
    const body = await fetchText(url);
    await writeFile(`${DIRECTORY}/${name}`, body, 'utf-8');
    console.log(`  ${name} (${body.length} bytes)`);

    return true;
  } catch (error) {
    console.error(`  ${name} FAILED: ${(error as Error).message}`);

    return false;
  }
}

async function run(): Promise<void> {
  await mkdir(DIRECTORY, { recursive: true });
  console.log(`capturing ${CAPTURES.length} fixtures into ${DIRECTORY}`);

  const results = await Promise.all(CAPTURES.map(capture));
  const failed = results.filter((ok) => !ok).length;

  if (failed > 0) {
    console.error(`\n${failed} could not be captured; the rest are written`);
    process.exit(1);
  }
}

await run();
