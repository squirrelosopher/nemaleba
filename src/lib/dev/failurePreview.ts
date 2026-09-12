const PARAM = 'fail';

export function failIfAsked(url: URL): void {
  if (url.searchParams.has(PARAM)) {
    throw new Error('simulated failure');
  }
}
