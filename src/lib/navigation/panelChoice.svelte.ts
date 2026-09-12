import { UTILITIES, type Utility } from '$lib/domain/utility';

const STORAGE_KEY = 'nemaleba:panels';

type Panels = Partial<Record<string, Utility>>;

function isUtility(value: unknown): value is Utility {
  return UTILITIES.includes(value as Utility);
}

function restore(): Panels {
  try {
    const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '{}') as Panels;

    return Object.fromEntries(
      Object.entries(stored).filter(([, utility]) => isUtility(utility))
    );
  } catch {
    return {};
  }
}

// Which panel a city page was left on. The back link out of a city's comments is an
// ordinary anchor rather than the browser's own gesture, so it arrives as a fresh page
// with nothing of the last one on it -- a reader reading about water was handed
// electricity for having looked at the comments.
class PanelChoice {
  private panels = $state<Panels>(restore());

  of(cityId: string): Utility | null {
    return this.panels[cityId] ?? null;
  }

  remember(cityId: string, utility: Utility): void {
    if (this.panels[cityId] === utility) {
      return;
    }

    this.panels = { ...this.panels, [cityId]: utility };

    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(this.panels));
    } catch {
      return;
    }
  }
}

export const panelChoice = new PanelChoice();
