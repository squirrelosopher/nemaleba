import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { ServerResponse } from 'node:http';
import type { Connect, Plugin } from 'vite';

const STORE_PATH = '.cache/subscriptions.json';
const CONFIRMATIONS_PATH_FILE = '.cache/confirmations.json';
const SUBSCRIBE_PATH = '/api/push/subscribe';
const CITIES_PATH = '/api/push/cities';
const PREFERENCES_PATH = '/api/push/preferences';
const CONFIRM_PATH = '/api/confirm';
const CONFIRMATIONS_PATH = '/api/confirmations';
const COMMENTS_PATH = '/api/comments';
const COMMENTS_STORE_PATH = '.cache/comments.json';
const HTTP_OK = 200;
const HTTP_BAD_REQUEST = 400;
const HTTP_NOT_FOUND = 404;
const HTTP_UNPROCESSABLE = 422;
const HTTP_TOO_MANY_REQUESTS = 429;

const COMMENT_MAX_LENGTH = 280;
const COMMENT_LIFETIME_SECONDS = 24 * 60 * 60;
const COMMENTS_PER_WINDOW = 2;
const COMMENTS_PER_ADDRESS = 10;
const RATE_WINDOW_SECONDS = 60 * 60;

const LINK_PATTERN = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|rs|info|biz|xyz|ru|io)\b)/i;

interface StoredComment {
  id: string;
  cityId: string;
  body: string;
  token: string;
  address?: string;
  created_at: number;
}

async function readComments(): Promise<StoredComment[]> {
  try {
    return JSON.parse(await readFile(COMMENTS_STORE_PATH, 'utf-8')) as StoredComment[];
  } catch {
    return [];
  }
}

async function writeComments(entries: StoredComment[]): Promise<void> {
  await mkdir(dirname(COMMENTS_STORE_PATH), { recursive: true });
  await writeFile(COMMENTS_STORE_PATH, `${JSON.stringify(entries, null, 2)}\n`, 'utf-8');
}

export interface StoredPreferences {
  locale: string;
  electricity: boolean;
  water: boolean;
  grouped: boolean;
}

export interface StoredSubscription {
  subscription: unknown;
  cities: string[];
  preferences?: StoredPreferences;
}

export const DEFAULT_STORED_PREFERENCES: StoredPreferences = {
  locale: 'sr-latn',
  electricity: true,
  water: true,
  grouped: false
};

export async function readSubscriptions(): Promise<StoredSubscription[]> {
  try {
    return JSON.parse(await readFile(STORE_PATH, 'utf-8')) as StoredSubscription[];
  } catch {
    return [];
  }
}

async function writeSubscriptions(entries: StoredSubscription[]): Promise<void> {
  await mkdir(dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, `${JSON.stringify(entries, null, 2)}\n`, 'utf-8');
}

function endpointOf(entry: StoredSubscription): string {
  return (entry.subscription as { endpoint?: string }).endpoint ?? '';
}

async function readBody(request: Connect.IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(chunk as Buffer);
  }

  return Buffer.concat(chunks).toString('utf-8');
}

interface ConfirmationRecord {
  outageId: string;
  voterId: string;
}

export async function readConfirmations(): Promise<ConfirmationRecord[]> {
  try {
    return JSON.parse(await readFile(CONFIRMATIONS_PATH_FILE, 'utf-8')) as ConfirmationRecord[];
  } catch {
    return [];
  }
}

async function writeConfirmations(records: ConfirmationRecord[]): Promise<void> {
  await mkdir(dirname(CONFIRMATIONS_PATH_FILE), { recursive: true });
  await writeFile(CONFIRMATIONS_PATH_FILE, `${JSON.stringify(records, null, 2)}\n`, 'utf-8');
}

function summarise(records: ConfirmationRecord[], ids: string[], voterId: string) {
  return ids.map((outageId) => {
    const forOutage = records.filter((record) => record.outageId === outageId);

    return {
      outageId,
      count: forOutage.length,
      confirmed: forOutage.some((record) => record.voterId === voterId)
    };
  });
}

export function devApiServer(): Plugin {
  return {
    name: 'nemaleba-dev-api',
    apply: 'serve',
    configureServer(server) {
      const sendJson = (response: ServerResponse, value: unknown) => {
        response.statusCode = HTTP_OK;
        response.setHeader('Content-Type', 'application/json');
        response.end(JSON.stringify(value));
      };

      server.middlewares.use(async (request, response, next) => {
        const url = request.url ?? '';

        if (url.startsWith(CONFIRMATIONS_PATH) && request.method === 'GET') {
          const params = new URL(url, 'http://localhost').searchParams;
          const ids = (params.get('ids') ?? '').split(',').filter(Boolean);
          const voterId = params.get('voter') ?? '';
          sendJson(response, summarise(await readConfirmations(), ids, voterId));
          return;
        }

        if (url.startsWith(CONFIRM_PATH) && request.method === 'POST') {
          const payload = JSON.parse(await readBody(request)) as ConfirmationRecord;
          const records = await readConfirmations();
          const isMine = (record: ConfirmationRecord) =>
            record.outageId === payload.outageId && record.voterId === payload.voterId;

          const existing = records.some(isMine);
          const updated = existing ? records.filter((record) => !isMine(record)) : [...records, payload];

          await writeConfirmations(updated);
          sendJson(response, {
            outageId: payload.outageId,
            count: updated.filter((record) => record.outageId === payload.outageId).length,
            confirmed: !existing
          });
          return;
        }

        if (url.startsWith(PREFERENCES_PATH) && request.method === 'GET') {
          const endpoint = new URL(url, 'http://localhost').searchParams.get('endpoint') ?? '';
          const stored = await readSubscriptions();
          const match = stored.find((entry) => endpointOf(entry) === endpoint);

          sendJson(response, match?.preferences ?? DEFAULT_STORED_PREFERENCES);
          return;
        }

        if (url.startsWith(PREFERENCES_PATH) && request.method === 'POST') {
          const payload = JSON.parse(await readBody(request)) as StoredPreferences & {
            endpoint: string;
          };

          const stored = await readSubscriptions();
          const updated = stored.map((entry) =>
            endpointOf(entry) === payload.endpoint
              ? {
                  ...entry,
                  preferences: {
                    locale: payload.locale ?? DEFAULT_STORED_PREFERENCES.locale,
                    electricity: payload.electricity !== false,
                    water: payload.water !== false,
                    grouped: payload.grouped === true
                  }
                }
              : entry
          );

          await writeSubscriptions(updated);
          sendJson(response, { ok: true });
          return;
        }

        if (url.startsWith(COMMENTS_PATH) && request.method === 'GET') {
          const cityId = new URL(url, 'http://localhost').searchParams.get('city') ?? '';
          const since = Math.floor(Date.now() / 1000) - COMMENT_LIFETIME_SECONDS;
          const stored = await readComments();

          const visible = stored
            .filter((entry) => entry.cityId === cityId && entry.created_at > since)
            .sort((left, right) => right.created_at - left.created_at)
            .map(({ id, body, created_at }) => ({ id, body, created_at }));

          sendJson(response, { comments: visible });
          return;
        }

        if (url.startsWith(COMMENTS_PATH) && request.method === 'POST') {
          const payload = JSON.parse(await readBody(request)) as {
            cityId?: string;
            body?: string;
            token?: string;
          };

          const body = (payload.body ?? '').trim();
          const cityId = (payload.cityId ?? '').trim();
          const token = (payload.token ?? '').trim();

          if (!cityId || !token || body.length === 0 || body.length > COMMENT_MAX_LENGTH) {
            response.statusCode = HTTP_BAD_REQUEST;
            response.end();
            return;
          }

          if (LINK_PATTERN.test(body)) {
            response.statusCode = HTTP_UNPROCESSABLE;
            response.end();
            return;
          }

          const now = Math.floor(Date.now() / 1000);
          const windowStart = now - RATE_WINDOW_SECONDS;
          const address = request.socket.remoteAddress ?? '';
          const stored = await readComments();
          const within = stored.filter((entry) => entry.created_at > windowStart);

          const byToken = within.filter((entry) => entry.token === token);
          const byAddress = within.filter((entry) => entry.address === address);

          if (byToken.length >= COMMENTS_PER_WINDOW || byAddress.length >= COMMENTS_PER_ADDRESS) {
            response.statusCode = HTTP_TOO_MANY_REQUESTS;
            response.end();
            return;
          }

          await writeComments([
            ...stored,
            { id: crypto.randomUUID(), cityId, body, token, address, created_at: now }
          ]);

          sendJson(response, { ok: true });
          return;
        }

        if (url.startsWith(CITIES_PATH) && request.method === 'GET') {
          const endpoint = new URL(url, 'http://localhost').searchParams.get('endpoint') ?? '';
          const stored = await readSubscriptions();
          const match = stored.find((entry) => endpointOf(entry) === endpoint);

          response.statusCode = HTTP_OK;
          response.setHeader('Content-Type', 'application/json');
          response.end(JSON.stringify(match?.cities ?? []));
          return;
        }

        if (!url.startsWith(SUBSCRIBE_PATH)) {
          next();
          return;
        }

        if (request.method !== 'POST') {
          response.statusCode = HTTP_NOT_FOUND;
          response.end();
          return;
        }

        try {
          const payload = JSON.parse(await readBody(request)) as StoredSubscription;
          const endpoint = endpointOf(payload);

          if (!endpoint) {
            response.statusCode = HTTP_BAD_REQUEST;
            response.end();
            return;
          }

          const existing = await readSubscriptions();
          const others = existing.filter((entry) => endpointOf(entry) !== endpoint);
          const updated = payload.cities.length > 0 ? [...others, payload] : others;

          await writeSubscriptions(updated);
          server.config.logger.info(
            `[push] ${endpoint.slice(0, 48)}… → ${payload.cities.join(', ') || 'unsubscribed'}`
          );

          response.statusCode = HTTP_OK;
          response.end('{"ok":true}');
        } catch {
          response.statusCode = HTTP_BAD_REQUEST;
          response.end();
        }
      });
    }
  };
}
