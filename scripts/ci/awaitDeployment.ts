import { readFileSync } from 'node:fs';
import { fetchJson } from '../sources/httpClient';

const REGISTRY_PATH = 'static/data/registry.json';
const ATTEMPTS = 40;
const INTERVAL_MS = 15_000;

interface Stamped {
  generatedAt: string;
}

function builtStamp(): string {
  return (JSON.parse(readFileSync(REGISTRY_PATH, 'utf-8')) as Stamped).generatedAt;
}

function registryUrl(): string {
  const origin = process.env.SITE_ORIGIN;

  if (!origin) {
    throw new Error('SITE_ORIGIN is not set');
  }

  return `${origin.replace(/\/$/, '')}/data/registry.json`;
}

async function servedStamp(url: string): Promise<string | null> {
  try {
    return (await fetchJson<Stamped>(url)).generatedAt;
  } catch {
    return null;
  }
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function main(): Promise<void> {
  const built = builtStamp();
  const url = registryUrl();

  for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
    const served = await servedStamp(url);

    if (served === built) {
      console.log(`deployment serving ${built} (check ${attempt})`);
      return;
    }

    console.log(`check ${attempt}/${ATTEMPTS}: serving ${served ?? 'nothing'}, want ${built}`);

    if (attempt < ATTEMPTS) {
      await wait(INTERVAL_MS);
    }
  }

  const seconds = ((ATTEMPTS - 1) * INTERVAL_MS) / 1000;
  throw new Error(`deployment did not serve ${built} within ${seconds}s`);
}

main().catch((error: unknown) => {
  console.error((error as Error).message);
  process.exit(1);
});
