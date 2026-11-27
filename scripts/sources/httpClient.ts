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

// A refusal is often momentary: the WordPress hosts behind firewalls answered some runs and
// not others on 26-27 November, about ten of them at once. Two more attempts, spaced out
// and jittered so the hosts are not asked in lockstep, cost seconds against a city that
// would otherwise lose its page for an hour.
const RETRY_DELAYS_MS = [2_000, 6_000];

// How much of an unexpected body to keep in the reason. Enough to tell a Cloudflare
// challenge from an Imunify360 or Wordfence page, which is what decides the next step.
const SNIPPET_LENGTH = 160;

export async function fetchText(url: string, retryDelays = RETRY_DELAYS_MS): Promise<string> {
  return withRetries(() => fetchOnce(url), retryDelays);
}

export async function fetchJson<T>(url: string, retryDelays = RETRY_DELAYS_MS): Promise<T> {
  return withRetries(async () => {
    const body = await fetchOnce(url);

    try {
      return JSON.parse(body) as T;
    } catch {
      throw new SourceUnreachable(`response was not JSON for ${url}: "${snippet(body)}"`);
    }
  }, retryDelays);
}

async function withRetries<T>(attempt: () => Promise<T>, delays: number[]): Promise<T> {
  for (const delay of delays) {
    try {
      return await attempt();
    } catch (error) {
      if (!(error instanceof SourceUnreachable)) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, delay * (0.5 + Math.random())));
    }
  }

  return attempt();
}

function snippet(body: string): string {
  return body.replace(/\s+/g, ' ').trim().slice(0, SNIPPET_LENGTH);
}

async function fetchOnce(url: string): Promise<string> {
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
