import { withoutLocale } from '$lib/i18n/routing';

const STORAGE_KEY = 'nemaleba:trail';
const DEPTH = 12;

function restore(): string[] {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '[]') as string[];
  } catch {
    return [];
  }
}

// Where the reader has been, in order, so a page can offer the way back to what they
// were actually reading rather than to the top of the site. One remembered page cannot
// do this: going into a city's comments and out again would forget the notifications
// page that led there.
//
//   /obavestenja -> /beograd -> /beograd/komentari      stack: [/obavestenja, /beograd]
//   back out of the comments                            stack: [/obavestenja]
//   back out of the city                                stack: []
class Trail {
  private steps = $state<string[]>(restore());

  get previous(): string | null {
    return this.steps.at(-1) ?? null;
  }

  // A step back pops what it returns through; a step forward remembers what it left.
  walked(left: string | null, arrived: string | null, back: boolean, distance: number): void {
    if (back) {
      this.steps = this.steps.slice(0, Math.max(this.steps.length - distance, 0));
      this.persist();
      return;
    }

    if (!left) {
      return;
    }

    const path = withoutLocale(left);

    // The back link in a page is an ordinary anchor, so following it arrives here as a
    // step forward and used to be remembered as one. The trail then grew instead of
    // unwinding and the two pages pointed at each other: back from /obavestenja went to
    // /beograd, back from /beograd went to /obavestenja, with no way out but the phone's
    // own gesture. Arriving at the page the trail says is behind us is a step back
    // whichever control took us there.
    if (arrived !== null && this.steps.at(-1) === withoutLocale(arrived)) {
      this.steps = this.steps.slice(0, -1);
      this.persist();
      return;
    }

    if (this.steps.at(-1) === path) {
      return;
    }

    this.steps = [...this.steps, path].slice(-DEPTH);
    this.persist();
  }

  private persist(): void {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(this.steps));
    } catch {
      return;
    }
  }
}

export const trail = new Trail();
