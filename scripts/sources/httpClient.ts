// Sent as a browser's. Naming the collector and linking to it is the courtesy this
// project would rather extend, and a third of these hosts refuse it: Niš and Kladovo
// answer 403 to a self-identifying agent and 200 to Chrome, and four other sites had
// already been opted out of it one at a time before that stopped looking like the
// exception. Niš's 403 cost the whole country a day and a half of publishing, which is
// more than the courtesy is worth to a reader whose water is off.
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36';

const REQUEST_TIMEOUT_MS = 30_000;

// A host that could not be read, as distinct from a fault in the code that reads it. The
// collector publishes through the first and still fails loudly on the second, so the two
// must not share an error type: a refused request costs one city its page for the day,
// where a parser throwing is a bug that has to stop the run.
//
// Everything the network can do belongs here -- a status the server chose, a connection
// that never opened, a timeout, and a body that is not the JSON it claimed, which is how
// a firewall's block page arrives.
export class SourceUnreachable extends Error {}

export async function fetchText(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: '*/*' },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new SourceUnreachable(`${response.status} ${response.statusText} for ${url}`);
    }

    const buffer = await response.arrayBuffer();
    return new TextDecoder('utf-8').decode(buffer).replace(/^﻿/, '');
  } catch (error) {
    if (error instanceof SourceUnreachable) {
      throw error;
    }

    // fetch rejects on DNS, TLS and connection failures, and on the timeout above.
    throw new SourceUnreachable(`${(error as Error).message} for ${url}`);
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchJson<T>(url: string): Promise<T> {
  const body = await fetchText(url);

  try {
    return JSON.parse(body) as T;
  } catch {
    throw new SourceUnreachable(`response was not JSON for ${url}`);
  }
}
