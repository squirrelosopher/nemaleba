const USER_AGENT = 'nemaleba.rs outage collector (+https://nemaleba.rs)';
const REQUEST_TIMEOUT_MS = 30_000;

export const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36';

export interface FetchOptions {
  userAgent?: string;
}

export async function fetchText(url: string, options: FetchOptions = {}): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': options.userAgent ?? USER_AGENT, Accept: '*/*' },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText} for ${url}`);
    }

    const buffer = await response.arrayBuffer();
    return new TextDecoder('utf-8').decode(buffer).replace(/^﻿/, '');
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchJson<T>(url: string, options: FetchOptions = {}): Promise<T> {
  return JSON.parse(await fetchText(url, options)) as T;
}
