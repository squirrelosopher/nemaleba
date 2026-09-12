export interface InstallEvent extends Event {
  prompt(): Promise<void>;
}

type PromptHolder = Window & { nemalebaInstall?: InstallEvent };

const EVENT = 'beforeinstallprompt';

class InstallPrompt {
  private pending = $state<InstallEvent | null>(null);

  get isOffered(): boolean {
    return this.pending !== null;
  }

  listen(): () => void {
    const holder = window as PromptHolder;
    const capture = (event: Event) => {
      event.preventDefault();
      this.pending = event as InstallEvent;
    };

    this.pending = holder.nemalebaInstall ?? null;
    window.addEventListener(EVENT, capture);

    return () => window.removeEventListener(EVENT, capture);
  }

  async request(): Promise<void> {
    const event = this.pending;

    if (!event) {
      return;
    }

    await event.prompt();

    delete (window as PromptHolder).nemalebaInstall;
    this.pending = null;
  }
}

export const installPrompt = new InstallPrompt();
