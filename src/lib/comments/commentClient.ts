import { env } from '$env/dynamic/public';

export const COMMENT_MAX_LENGTH = 280;

export const PostResult = {
  Posted: 'posted',
  RateLimited: 'rate-limited',
  LinksRejected: 'links-rejected',
  Failed: 'failed'
} as const;

export type PostResult = (typeof PostResult)[keyof typeof PostResult];

export interface Comment {
  id: string;
  body: string;
  created_at: number;
}

const TOKEN_KEY = 'nemaleba:commenter';

const HTTP_UNPROCESSABLE = 422;
const HTTP_TOO_MANY_REQUESTS = 429;

function endpoint(): string {
  return env.PUBLIC_API_ENDPOINT ?? '';
}

export function commentsAvailable(): boolean {
  return endpoint().length > 0;
}

function commenterToken(): string {
  try {
    const stored = localStorage.getItem(TOKEN_KEY);

    if (stored) {
      return stored;
    }

    const minted = crypto.randomUUID();
    localStorage.setItem(TOKEN_KEY, minted);

    return minted;
  } catch {
    return '';
  }
}

export async function loadComments(cityId: string): Promise<Comment[]> {
  if (!commentsAvailable()) {
    return [];
  }

  const response = await fetch(`${endpoint()}/comments?city=${encodeURIComponent(cityId)}`);

  if (!response.ok) {
    throw new Error(`comments unavailable (${response.status})`);
  }

  const payload = (await response.json()) as { comments?: Comment[] };

  return payload.comments ?? [];
}

export async function postComment(cityId: string, body: string): Promise<PostResult> {
  if (!commentsAvailable()) {
    return PostResult.Failed;
  }

  try {
    const response = await fetch(`${endpoint()}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cityId, body, token: commenterToken() })
    });

    if (response.ok) {
      return PostResult.Posted;
    }

    if (response.status === HTTP_TOO_MANY_REQUESTS) {
      return PostResult.RateLimited;
    }

    return response.status === HTTP_UNPROCESSABLE
      ? PostResult.LinksRejected
      : PostResult.Failed;
  } catch {
    return PostResult.Failed;
  }
}
