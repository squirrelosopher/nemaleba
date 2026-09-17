// Sent as a browser's. Naming the collector and linking to it is the courtesy this
// project would rather extend, and a third of these hosts refuse it: Niš and Kladovo
// answer 403 to a self-identifying agent and 200 to Chrome, and four other sites had
// already been opted out of it one at a time before that stopped looking like the
// exception. Niš's 403 cost the whole country a day and a half of publishing, which is
// more than the courtesy is worth to a reader whose water is off.
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36';

const REQUEST_TIMEOUT_MS = 30_000;

export async function fetchText(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: '*/*' },
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

export async function fetchJson<T>(url: string): Promise<T> {
  return JSON.parse(await fetchText(url)) as T;
}
