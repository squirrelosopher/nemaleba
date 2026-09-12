export const Theme = {
  Dark: 'dark',
  Light: 'light'
} as const;

export type Theme = (typeof Theme)[keyof typeof Theme];

const STORAGE_KEY = 'nemaleba:theme';

const CHROME_COLOUR: Record<Theme, string> = {
  [Theme.Dark]: '#0c0a09',
  [Theme.Light]: '#faf9f7'
};

function storedTheme(): Theme {
  if (typeof localStorage === 'undefined') {
    return Theme.Dark;
  }

  try {
    return localStorage.getItem(STORAGE_KEY) === Theme.Light ? Theme.Light : Theme.Dark;
  } catch {
    return Theme.Dark;
  }
}

class ThemePreference {
  // Read at construction rather than on mount. The inline script in app.html has already
  // stamped the theme onto the document by then, so starting at Dark and correcting later
  // left the toggle's own label disagreeing with the colours around it until hydration.
  current = $state<Theme>(storedTheme());

  select(theme: Theme): void {
    this.current = theme;
    this.apply();

    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      return;
    }
  }

  private apply(): void {
    if (typeof document === 'undefined') {
      return;
    }

    const root = document.documentElement;

    root.dataset.themeSwitching = '';
    root.dataset.theme = this.current;

    const chrome = document.querySelector<HTMLMetaElement>('meta[name=theme-color]');

    if (chrome) {
      chrome.content = CHROME_COLOUR[this.current];
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => delete root.dataset.themeSwitching);
    });
  }
}

export const themePreference = new ThemePreference();
