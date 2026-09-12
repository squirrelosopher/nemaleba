export interface Environment {
  SUBSCRIPTIONS: D1Database;
  ALLOWED_ORIGIN: string;
  ADMIN_TOKEN: string;
  COMMENT_SALT: string;
}

const HTTP_OK = 200;
const HTTP_NO_CONTENT = 204;
const HTTP_BAD_REQUEST = 400;
const HTTP_UNAUTHORIZED = 401;
const HTTP_NOT_FOUND = 404;
const HTTP_TOO_MANY_REQUESTS = 429;
const HTTP_UNPROCESSABLE = 422;
const HTTP_UNAVAILABLE = 503;

const COMMENT_MAX_LENGTH = 280;
const COMMENT_LIFETIME_SECONDS = 24 * 60 * 60;
const COMMENTS_PER_WINDOW = 2;
const COMMENTS_PER_ADDRESS = 10;
const RATE_WINDOW_SECONDS = 60 * 60;
const COMMENT_PAGE_SIZE = 100;

const LINK_PATTERN = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|rs|info|biz|xyz|ru|io)\b)/i;

interface CommentRequest {
  cityId?: string;
  body?: string;
  token?: string;
}

interface CommentRow {
  id: string;
  body: string;
  created_at: number;
}

interface SubscribeRequest {
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } };
  cities: string[];
}

interface SubscriptionRow {
  endpoint: string;
  p256dh: string;
  auth: string;
  locale: string | null;
  notify_electricity: number | null;
  notify_water: number | null;
  notify_grouped: number | null;
}

interface PreferencesRequest {
  endpoint: string;
  locale?: string;
  electricity?: boolean;
  water?: boolean;
  grouped?: boolean;
}

const DEFAULT_LOCALE = 'sr-latn';

/**
 * ALLOWED_ORIGIN is a comma separated list so the GitLab Pages URL and the eventual
 * custom domain can both work without a redeploy between them. The request's own
 * origin is echoed back when it is on the list, since a browser rejects a list.
 */
function corsHeaders(allowed: string, requestOrigin: string | null): Record<string, string> {
  const origins = allowed.split(',').map((entry) => entry.trim()).filter(Boolean);
  const permitted = requestOrigin && origins.includes(requestOrigin) ? requestOrigin : origins[0];

  return {
    'Access-Control-Allow-Origin': permitted ?? '',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    Vary: 'Origin'
  };
}

function json(body: unknown, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status: HTTP_OK,
    headers: { ...headers, 'Content-Type': 'application/json' }
  });
}

function isAuthorised(request: Request, token: string): boolean {
  return request.headers.get('Authorization') === `Bearer ${token}`;
}

async function persist(database: D1Database, payload: SubscribeRequest): Promise<void> {
  const { endpoint, keys } = payload.subscription;

  await database.prepare('DELETE FROM subscriptions WHERE endpoint = ?').bind(endpoint).run();

  if (payload.cities.length === 0) {
    await database.prepare('DELETE FROM user_preferences WHERE endpoint = ?').bind(endpoint).run();
    return;
  }

  const statement = database.prepare(
    'INSERT INTO subscriptions (endpoint, p256dh, auth, city_id) VALUES (?, ?, ?, ?)'
  );

  await database.batch(
    payload.cities.map((cityId) => statement.bind(endpoint, keys.p256dh, keys.auth, cityId))
  );
}

async function handleSubscribe(request: Request, environment: Environment, headers: Record<string, string>): Promise<Response> {
  const payload = (await request.json()) as SubscribeRequest;

  if (!payload.subscription?.endpoint) {
    return new Response('bad request', { status: HTTP_BAD_REQUEST, headers });
  }

  await persist(environment.SUBSCRIPTIONS, payload);
  return json({ ok: true }, headers);
}

async function handleSubscribers(url: URL, environment: Environment, headers: Record<string, string>): Promise<Response> {
  const cityId = url.searchParams.get('city');

  if (!cityId) {
    return new Response('missing city', { status: HTTP_BAD_REQUEST, headers });
  }

  const { results } = await environment.SUBSCRIPTIONS.prepare(
    `SELECT s.endpoint, s.p256dh, s.auth,
            p.locale, p.notify_electricity, p.notify_water, p.notify_grouped
       FROM subscriptions s
       LEFT JOIN user_preferences p ON p.endpoint = s.endpoint
      WHERE s.city_id = ?`
  )
    .bind(cityId)
    .all<SubscriptionRow>();

  return json(
    results.map((row) => ({
      endpoint: row.endpoint,
      keys: { p256dh: row.p256dh, auth: row.auth },
      preferences: {
        locale: row.locale ?? DEFAULT_LOCALE,
        electricity: row.notify_electricity !== 0,
        water: row.notify_water !== 0,
        grouped: row.notify_grouped === 1
      }
    })),
    headers
  );
}

async function handleCitiesForEndpoint(
  url: URL,
  environment: Environment,
  headers: Record<string, string>
): Promise<Response> {
  const endpoint = url.searchParams.get('endpoint');

  if (!endpoint) {
    return new Response('missing endpoint', { status: HTTP_BAD_REQUEST, headers });
  }

  const { results } = await environment.SUBSCRIPTIONS.prepare(
    'SELECT city_id FROM subscriptions WHERE endpoint = ?'
  )
    .bind(endpoint)
    .all<{ city_id: string }>();

  return json(
    results.map((row) => row.city_id),
    headers
  );
}

async function handleSubscribedCities(environment: Environment, headers: Record<string, string>): Promise<Response> {
  const { results } = await environment.SUBSCRIPTIONS.prepare(
    'SELECT DISTINCT city_id FROM subscriptions'
  ).all<{ city_id: string }>();

  return json(
    results.map((row) => row.city_id),
    headers
  );
}

interface ConfirmRequest {
  outageId: string;
  voterId: string;
}

async function countsFor(
  database: D1Database,
  outageIds: string[],
  voterId: string
): Promise<Array<{ outageId: string; count: number; confirmed: boolean }>> {
  const placeholders = outageIds.map(() => '?').join(',');

  const { results } = await database
    .prepare(
      `SELECT outage_id, COUNT(*) AS total,
              SUM(CASE WHEN voter_id = ? THEN 1 ELSE 0 END) AS mine
       FROM confirmations WHERE outage_id IN (${placeholders}) GROUP BY outage_id`
    )
    .bind(voterId, ...outageIds)
    .all<{ outage_id: string; total: number; mine: number }>();

  const byId = new Map(results.map((row) => [row.outage_id, row]));

  return outageIds.map((outageId) => ({
    outageId,
    count: byId.get(outageId)?.total ?? 0,
    confirmed: (byId.get(outageId)?.mine ?? 0) > 0
  }));
}

async function handleConfirmations(
  url: URL,
  environment: Environment,
  headers: Record<string, string>
): Promise<Response> {
  const outageIds = (url.searchParams.get('ids') ?? '').split(',').filter(Boolean);
  const voterId = url.searchParams.get('voter') ?? '';

  if (outageIds.length === 0) {
    return json([], headers);
  }

  return json(await countsFor(environment.SUBSCRIPTIONS, outageIds, voterId), headers);
}

async function handleConfirm(
  request: Request,
  environment: Environment,
  headers: Record<string, string>
): Promise<Response> {
  const { outageId, voterId } = (await request.json()) as ConfirmRequest;

  if (!outageId || !voterId) {
    return new Response('bad request', { status: HTTP_BAD_REQUEST, headers });
  }

  const database = environment.SUBSCRIPTIONS;
  const existing = await database
    .prepare('SELECT 1 FROM confirmations WHERE outage_id = ? AND voter_id = ?')
    .bind(outageId, voterId)
    .first();

  if (existing) {
    await database
      .prepare('DELETE FROM confirmations WHERE outage_id = ? AND voter_id = ?')
      .bind(outageId, voterId)
      .run();
  } else {
    await database
      .prepare('INSERT INTO confirmations (outage_id, voter_id) VALUES (?, ?)')
      .bind(outageId, voterId)
      .run();
  }

  const [summary] = await countsFor(database, [outageId], voterId);
  return json(summary, headers);
}

async function handleReadPreferences(
  url: URL,
  environment: Environment,
  headers: Record<string, string>
): Promise<Response> {
  const endpoint = url.searchParams.get('endpoint');

  if (!endpoint) {
    return new Response('missing endpoint', { status: HTTP_BAD_REQUEST, headers });
  }

  const row = await environment.SUBSCRIPTIONS.prepare(
    `SELECT locale, notify_electricity, notify_water, notify_grouped
       FROM user_preferences WHERE endpoint = ?`
  )
    .bind(endpoint)
    .first<{
      locale: string;
      notify_electricity: number;
      notify_water: number;
      notify_grouped: number;
    }>();

  return json(
    {
      locale: row?.locale ?? DEFAULT_LOCALE,
      electricity: row ? row.notify_electricity !== 0 : true,
      water: row ? row.notify_water !== 0 : true,
      grouped: row ? row.notify_grouped === 1 : false
    },
    headers
  );
}

async function handleSavePreferences(
  request: Request,
  environment: Environment,
  headers: Record<string, string>
): Promise<Response> {
  const payload = (await request.json()) as PreferencesRequest;

  if (!payload.endpoint) {
    return new Response('missing endpoint', { status: HTTP_BAD_REQUEST, headers });
  }

  await environment.SUBSCRIPTIONS.prepare(
    `INSERT INTO user_preferences
       (endpoint, locale, notify_electricity, notify_water, notify_grouped, updated_at)
     VALUES (?, ?, ?, ?, ?, unixepoch())
     ON CONFLICT (endpoint) DO UPDATE SET
       locale = excluded.locale,
       notify_electricity = excluded.notify_electricity,
       notify_water = excluded.notify_water,
       notify_grouped = excluded.notify_grouped,
       updated_at = excluded.updated_at`
  )
    .bind(
      payload.endpoint,
      payload.locale ?? DEFAULT_LOCALE,
      payload.electricity === false ? 0 : 1,
      payload.water === false ? 0 : 1,
      payload.grouped === true ? 1 : 0
    )
    .run();

  return json({ ok: true }, headers);
}

async function handleForget(
  url: URL,
  environment: Environment,
  headers: Record<string, string>
): Promise<Response> {
  const endpoint = url.searchParams.get('endpoint');

  if (!endpoint) {
    return new Response('missing endpoint', { status: HTTP_BAD_REQUEST, headers });
  }

  await environment.SUBSCRIPTIONS.batch([
    environment.SUBSCRIPTIONS.prepare('DELETE FROM subscriptions WHERE endpoint = ?').bind(endpoint),
    environment.SUBSCRIPTIONS.prepare('DELETE FROM user_preferences WHERE endpoint = ?').bind(endpoint)
  ]);

  return json({ ok: true }, headers);
}

async function fingerprint(material: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(material));

  return [...new Uint8Array(digest)]
    .slice(0, 16)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function connectingAddress(request: Request): string {
  return request.headers.get('CF-Connecting-IP') ?? '';
}

/**
 * Two identities, because they answer different questions. The author carries the
 * caller's own token so one browser is held to a small allowance, and clearing site
 * data mints a new one. The address carries nothing the caller chooses, so a wider
 * allowance still holds when the token is thrown away and asked for again.
 */
async function authorHash(request: Request, token: string, salt: string): Promise<string> {
  return fingerprint(`${salt}:${connectingAddress(request)}:${token}`);
}

async function addressHash(request: Request, salt: string): Promise<string> {
  return fingerprint(`${salt}:${connectingAddress(request)}`);
}

async function handleReadComments(
  url: URL,
  environment: Environment,
  headers: Record<string, string>
): Promise<Response> {
  const cityId = url.searchParams.get('city');

  if (!cityId) {
    return new Response('missing city', { status: HTTP_BAD_REQUEST, headers });
  }

  const since = Math.floor(Date.now() / 1000) - COMMENT_LIFETIME_SECONDS;

  const { results } = await environment.SUBSCRIPTIONS.prepare(
    `SELECT id, body, created_at FROM comments
     WHERE city_id = ? AND created_at > ?
     ORDER BY created_at DESC
     LIMIT ?`
  )
    .bind(cityId, since, COMMENT_PAGE_SIZE)
    .all<CommentRow>();

  return json({ comments: results ?? [] }, headers);
}

async function handlePostComment(
  request: Request,
  environment: Environment,
  headers: Record<string, string>
): Promise<Response> {
  if (!environment.COMMENT_SALT) {
    return new Response('comments unconfigured', { status: HTTP_UNAVAILABLE, headers });
  }

  const payload = (await request.json()) as CommentRequest;
  const body = (payload.body ?? '').trim();
  const cityId = (payload.cityId ?? '').trim();
  const token = (payload.token ?? '').trim();

  if (!cityId || !token || body.length === 0 || body.length > COMMENT_MAX_LENGTH) {
    return new Response('invalid comment', { status: HTTP_BAD_REQUEST, headers });
  }

  if (LINK_PATTERN.test(body)) {
    return new Response('links not allowed', { status: HTTP_UNPROCESSABLE, headers });
  }

  const author = await authorHash(request, token, environment.COMMENT_SALT);
  const address = await addressHash(request, environment.COMMENT_SALT);
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - RATE_WINDOW_SECONDS;

  const written = await environment.SUBSCRIPTIONS.prepare(
    `INSERT INTO comments (id, city_id, body, author_hash, address_hash, created_at)
     SELECT ?, ?, ?, ?, ?, ?
     WHERE (
       SELECT COUNT(*) FROM comments WHERE author_hash = ? AND created_at > ?
     ) < ?
     AND (
       SELECT COUNT(*) FROM comments WHERE address_hash = ? AND created_at > ?
     ) < ?`
  )
    .bind(
      crypto.randomUUID(),
      cityId,
      body,
      author,
      address,
      now,
      author,
      windowStart,
      COMMENTS_PER_WINDOW,
      address,
      windowStart,
      COMMENTS_PER_ADDRESS
    )
    .run();

  if (written.meta.changes === 0) {
    return new Response('too many comments', { status: HTTP_TOO_MANY_REQUESTS, headers });
  }

  return json({ ok: true }, headers);
}

export default {
  async fetch(request: Request, environment: Environment): Promise<Response> {
    const headers = corsHeaders(environment.ALLOWED_ORIGIN, request.headers.get('Origin'));

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: HTTP_NO_CONTENT, headers });
    }

    const url = new URL(request.url);

    try {
      if (request.method === 'POST' && url.pathname === '/push/subscribe') {
        return await handleSubscribe(request, environment, headers);
      }

      if (request.method === 'GET' && url.pathname === '/push/cities') {
        return await handleCitiesForEndpoint(url, environment, headers);
      }

      if (url.pathname === '/push/preferences') {
        return request.method === 'POST'
          ? await handleSavePreferences(request, environment, headers)
          : await handleReadPreferences(url, environment, headers);
      }

      if (url.pathname === '/comments') {
        return request.method === 'POST'
          ? await handlePostComment(request, environment, headers)
          : await handleReadComments(url, environment, headers);
      }

      if (request.method === 'GET' && url.pathname === '/confirmations') {
        return await handleConfirmations(url, environment, headers);
      }

      if (request.method === 'POST' && url.pathname === '/confirm') {
        return await handleConfirm(request, environment, headers);
      }

      if (request.method === 'GET' && url.pathname.startsWith('/subscribers')) {
        if (!isAuthorised(request, environment.ADMIN_TOKEN)) {
          return new Response('unauthorised', { status: HTTP_UNAUTHORIZED, headers });
        }

        return url.pathname === '/subscribers/cities'
          ? await handleSubscribedCities(environment, headers)
          : await handleSubscribers(url, environment, headers);
      }

      if (request.method === 'DELETE' && url.pathname === '/subscribers') {
        if (!isAuthorised(request, environment.ADMIN_TOKEN)) {
          return new Response('unauthorised', { status: HTTP_UNAUTHORIZED, headers });
        }

        return await handleForget(url, environment, headers);
      }

      return new Response('not found', { status: HTTP_NOT_FOUND, headers });
    } catch {
      return new Response('bad request', { status: HTTP_BAD_REQUEST, headers });
    }
  },

  async scheduled(_event: ScheduledEvent, environment: Environment): Promise<void> {
    const since = Math.floor(Date.now() / 1000) - COMMENT_LIFETIME_SECONDS;

    await environment.SUBSCRIPTIONS.prepare('DELETE FROM comments WHERE created_at <= ?')
      .bind(since)
      .run();
  }
};
