import { AsyncLocalStorage } from 'node:async_hooks';

const held = new AsyncLocalStorage<string[]>();

/**
 * Sources are collected concurrently, so a line written straight to the console lands in
 * the middle of another source's report and the run's output stops being readable — which
 * is the only thing that says which parser broke. Inside `captured` a line is held and
 * printed with the rest of that source's lines instead.
 *
 * Outside it, which is every other caller, the line goes to the console as it always did.
 */
export function warn(line: string): void {
  const lines = held.getStore();

  if (lines) {
    lines.push(line);
    return;
  }

  console.warn(line);
}

export async function captured<T>(work: () => Promise<T>): Promise<{ result: T; lines: string[] }> {
  const lines: string[] = [];
  const result = await held.run(lines, work);

  return { result, lines };
}
